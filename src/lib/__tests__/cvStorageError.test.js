const {
  describeStorageError,
  isStorageCredentialError,
  isStorageMissingObjectError,
} = require('@/lib/s3');
const { classifyCvStorageFailure } = require('@/lib/studentCvPresign');
const { CV_SYSTEM_ERROR_CODES } = require('@/lib/cvSystemErrorCodes');

describe('CV S3 error classification', () => {
  it('maps invalid access key to config guidance', () => {
    const err = { name: 'InvalidAccessKeyId', message: 'The AWS Access Key Id you provided does not exist' };
    expect(isStorageCredentialError(err)).toBe(true);
    expect(describeStorageError(err)).toMatch(/credentials are invalid/i);
    const classified = classifyCvStorageFailure(err);
    expect(classified.errorCode).toBe(CV_SYSTEM_ERROR_CODES.S3_CONFIG);
    expect(classified.gone).toBe(false);
    expect(classified.status).toBe(503);
  });

  it('maps missing object to gone / re-upload', () => {
    const err = { name: 'NoSuchKey', message: 'The specified key does not exist.' };
    expect(isStorageMissingObjectError(err)).toBe(true);
    const classified = classifyCvStorageFailure(err);
    expect(classified.errorCode).toBe(CV_SYSTEM_ERROR_CODES.S3_MISSING);
    expect(classified.gone).toBe(true);
    expect(classified.status).toBe(410);
  });
});
