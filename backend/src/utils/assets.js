export const isLegacyUploadPath = (value) =>
  typeof value === 'string' && value.startsWith('/uploads/');

export const publicAssetUrl = (value) => {
  if (!value) return '';
  if (isLegacyUploadPath(value) && process.env.ALLOW_LOCAL_UPLOAD_URLS !== 'true') {
    return '';
  }

  return value;
};

export const publicWriter = (writer) => {
  if (!writer) return writer;

  const data = typeof writer.toObject === 'function'
    ? writer.toObject({ virtuals: true })
    : { ...writer };

  return {
    ...data,
    avatar: publicAssetUrl(data.avatar),
    profileMusic: publicAssetUrl(data.profileMusic)
  };
};
