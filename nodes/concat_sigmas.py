import torch
from .utils import DynamicInputDict

class ConcatSigmas:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "input_count": ("INT", {"default": 2, "min": 2, "max": 100}),
            },
            "optional": DynamicInputDict({"sigma_1": ("SIGMAS",)})
        }

    RETURN_TYPES = ("SIGMAS",)
    FUNCTION = "concat"
    CATEGORY = "sampling/custom_math"

    def concat(self, input_count, **kwargs):
        sigmas_list =[]
        for i in range(1, input_count + 1):
            key = f"sigma_{i}"
            if key in kwargs:
                sigmas_list.append(kwargs[key])

        if not sigmas_list:
            return (torch.tensor([], dtype=torch.float32),)

        res_list =[]
        for i, sig in enumerate(sigmas_list):
            if i < len(sigmas_list) - 1 and len(sig) > 0:
                res_list.append(sig[:-1])
            else:
                res_list.append(sig)

        res = torch.cat(res_list, dim=0)
        return (res,)