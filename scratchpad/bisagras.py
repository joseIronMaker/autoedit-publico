import json, sys, re
v = sys.argv[1]
frases = sys.argv[2:]
w = json.load(open(f"{v}.autoedit/transcript.json"))["words"]
texto = [x["word"].lower().strip(".,¿?¡!") for x in w]
for f in frases:
    partes = f.lower().split()
    for i in range(len(texto) - len(partes) + 1):
        if texto[i:i+len(partes)] == partes:
            print(f"{w[i]['start']:7.2f}  {f}")
            break
    else:
        print(f"    ???  {f}")
