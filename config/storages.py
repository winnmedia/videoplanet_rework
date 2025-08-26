try:
    from storages.backends.s3boto3 import S3Boto3Storage
    
    class StaticStorage(S3Boto3Storage):
        location = "static/"
        file_overwrite = False

    class UploadStorage(S3Boto3Storage):
        location = "uploads/"
        
except ImportError:
    # Fallback for environments where django-storages is not installed
    import warnings
    warnings.warn("django-storages not available. S3 storage backends will not work.")
    
    class StaticStorage:
        pass
        
    class UploadStorage:
        pass
