import json
import sys
from argostranslate import translate

text, source, target = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({"translation": translate.translate(text, source, target)}, ensure_ascii=False))
