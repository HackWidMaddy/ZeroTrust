import random
from collections import defaultdict

# Sample text
text = "hello world"

# Build Markov chain
markov_chain = defaultdict(list)
for i in range(len(text) - 1):
    markov_chain[text[i]].append(text[i + 1])

# Predict next character
current_char = "l"
possible_next = markov_chain[current_char]
next_char = random.choice(possible_next)
print(f"Next character after '{current_char}' is likely '{next_char}'")

# Generate a sequence
generated = "h"
for _ in range(10):
    current_char = generated[-1]
    next_chars = markov_chain.get(current_char, [' '])
    generated += random.choice(next_chars)
print("Generated text:", generated)
