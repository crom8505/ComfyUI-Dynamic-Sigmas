class DynamicInputDict(dict):
    def __init__(self, base_dict, default_type=("SIGMAS",)):
        super().__init__(base_dict)
        self.default_type = default_type

    def __contains__(self, key):
        return True

    def __getitem__(self, key):
        return super().get(key, self.default_type)

class DynamicReturnType(tuple):
    def __new__(cls, base_tuple, default_type="IMAGE", max_len=100):
        instance = super().__new__(cls, base_tuple)
        instance.default_type = default_type
        instance.max_len = max_len
        return instance

    def __len__(self):
        return self.max_len

    def __getitem__(self, index):
        if index < super().__len__():
            return super().__getitem__(index)
        return self.default_type

class DynamicReturnNames(tuple):
    def __new__(cls, base_tuple, prefix="IMAGE_", max_len=100):
        instance = super().__new__(cls, base_tuple)
        instance.prefix = prefix
        instance.max_len = max_len
        return instance

    def __len__(self):
        return self.max_len

    def __getitem__(self, index):
        if index < super().__len__():
            return super().__getitem__(index)
        return f"{self.prefix}{index + 1}"