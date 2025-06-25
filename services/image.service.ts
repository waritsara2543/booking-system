import storageClient from "@/lib/supabase-client";

const uploadImageToBucket = async (
  image: File,
  prefixName: string,
  bucketName: string
): Promise<{ data: any }> => {

  const fileName = `${prefixName}_${Date.now()}.png`;
  const { data, error } = await storageClient
    .from(bucketName)
    .upload(fileName, image);

  if (error) {
    throw new Error("Error upload image from bucket");
  }

  return { data };
};

export const removeImageFromBucket = async (
  bucketName: string,
  url: string   
) => {
  const file = decodeURIComponent(url.split("/").pop() as string);
  const { data, error } = await storageClient.from(bucketName).remove([file]);
  if (error) {
    throw new Error("Error removing image from bucket");
  }
  return data;
};

const getPublicUrl = async (
  path: string,
  bucket: string
): Promise<{ data: any }> => {
  const { data } = await storageClient.from(bucket).getPublicUrl(path, {});
  return { data };
};

const ImageService = {
  uploadImageToBucket,
  removeImageFromBucket,
  getPublicUrl,
};

export default ImageService;