from .nodes.dynamic_sigma_scheduler import DynamicSigmaScheduler
from .nodes.concat_sigmas import ConcatSigmas
from .nodes.graph_sigmas import GraphSigmas

NODE_CLASS_MAPPINGS = {
    "DynamicSigmaScheduler": DynamicSigmaScheduler,
    "ConcatSigmas": ConcatSigmas,
    "GraphSigmas": GraphSigmas
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DynamicSigmaScheduler": "Dynamic Sigma Scheduler",
    "ConcatSigmas": "Concat Sigmas",
    "GraphSigmas": "Graph Sigmas"
}

WEB_DIRECTORY = "./web/js"

__all__ =["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]