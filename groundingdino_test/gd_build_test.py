import sys, time
print('python', sys.version.split()[0])
from groundingdino.util.slconfig import SLConfig
from groundingdino.models import build_model
import torch

cfg_path = r"C:\Users\denny\Downloads\Hermes_Workspace\GroundingDINO_SwinT_OGC.cfg.py"
args = SLConfig.fromfile(cfg_path)
print('config keys:', list(args.keys())[:12])

t0 = time.time()
model = build_model(args)
print('model built in %.1fs' % (time.time() - t0))

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model.to(device).eval()
print('device:', device)

x = torch.randn(1, 3, 800, 800).to(device)
with torch.no_grad():
    out = model(x, captions=['cat.'])
print('pred_logits:', tuple(out['pred_logits'].shape), ' pred_boxes:', tuple(out['pred_boxes'].shape))
print('FULL BUILD + FORWARD OK')