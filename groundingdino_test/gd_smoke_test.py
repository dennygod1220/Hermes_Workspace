import sys
print('python', sys.version.split()[0])
print('executable', sys.executable)

import groundingdino, os
print('groundingdino pkg:', os.path.dirname(groundingdino.__file__))
try:
    from groundingdino import __version__
    print('groundingdino version attr:', __version__)
except Exception as e:
    print('version attr missing:', type(e).__name__)

# Exact imports the node uses (AILab_Segment.py __init__)
from groundingdino.datasets import transforms as T
from groundingdino.util.utils import clean_state_dict
from groundingdino.util.slconfig import SLConfig
from groundingdino.models import build_model
print('node imports OK')

import torch, torchvision, transformers, addict, yapf, timm, yaml
print('torch', torch.__version__, '| torchvision', torchvision.__version__,
      '| transformers', transformers.__version__, '| cuda available', torch.cuda.is_available())

# Compiled ops check + pure-pytorch fallback
try:
    from groundingdino import _C
    print('_C compiled ops: PRESENT')
except Exception as e:
    print('_C compiled ops: absent ->', type(e).__name__)

try:
    from groundingdino.models.GroundingDINO.ms_deform_attn import multi_scale_deformable_attn_pytorch
    bs, nq, nh, nl, npt, ed = 1, 4, 8, 3, 2, 32
    v = torch.randn(bs, 8*8 + 4*4 + 2*2, nh, ed)
    shapes = torch.tensor([[8, 8], [4, 4], [2, 2]], dtype=torch.long)
    samples = torch.rand(bs, nq, nh, nl, npt, 2)
    weights = torch.rand(bs, nq, nh, nl, npt).softmax(-1)
    out = multi_scale_deformable_attn_pytorch(v, shapes, samples, weights)
    print('fallback deformable attn output:', tuple(out.shape))
except Exception as e:
    import traceback; traceback.print_exc()
    print('FALLBACK TEST FAILED:', type(e).__name__, e)

# Pull at least one real config through the full build_model path (no weights needed)
print('SMOKE DONE')