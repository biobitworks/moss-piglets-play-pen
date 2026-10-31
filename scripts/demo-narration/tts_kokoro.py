# Narration for the demo: pip install kokoro-onnx soundfile, download kokoro-v1.0.onnx + voices-v1.0.bin from
# github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0), then: python tts_kokoro.py <dir with script.json>
import json,os,sys,soundfile as sf
from kokoro_onnx import Kokoro
d=sys.argv[1]; k=Kokoro(os.environ.get("KOKORO_MODEL","kokoro-v1.0.onnx"),os.environ.get("KOKORO_VOICES","voices-v1.0.bin"))
out={}
for name,text in json.load(open(f"{d}/script.json")):
    a,sr=k.create(text,voice=sys.argv[2] if len(sys.argv)>2 else "af_heart",speed=1.12,lang="en-us")
    sf.write(f"{d}/{name}.wav",a,sr); out[name]=len(a)/sr; print(name,round(len(a)/sr,2))
json.dump(out,open(f"{d}/dur.json","w"))
print("total",round(sum(out.values()),1))
