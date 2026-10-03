"""Run actual pretrained inference on the preselected showcase samples."""
import csv,json,platform
from detector import ROOT, Detector, load_audio
import numpy as np,torch

def main():
    manifest=json.loads((ROOT/'assets/manifest.json').read_text())
    detector=Detector(); rows=[]
    for item in manifest:
        audio=load_audio(ROOT/item['path']); result=detector.predict(audio)
        assert np.isfinite([result['genuine_logit'],result['synthetic_logit']]).all()
        rows.append({'sample_id':item['sample_id'],'known_label':item['label'],**result})
        print(item['sample_id'], item['label'],result['prediction'],round(result['genuine_margin'],3))
    path=ROOT/'results/baseline.csv';path.parent.mkdir(exist_ok=True)
    with path.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
    print(f'PASS: {len(rows)} inference calls completed. This is a functional test, not proof of detection accuracy.')
    print('Python',platform.python_version(),'PyTorch',torch.__version__)
    print('Saved',path)
if __name__=='__main__': main()
