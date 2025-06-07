import {IFile} from '../../db/models/file-system/file';
import {ObjectId} from "mongodb";
import {Model} from "../../db/models";
import {getLogger} from "../../utils/logger";
import S3 from "../../utils/s3";

export const get = async (fileId: ObjectId): Promise<IFile> => {
  return Model.Files.findOne({_id: fileId})
}
export const create = async (file: IFile): Promise<IFile> => {
  const {insertedId} = await Model.Files.insertOne(file)
  file._id = insertedId
  return file
}
export const update = async (fileId: ObjectId, change: IFile): Promise<IFile> => {
  const rs = await Model.Files.findOneAndUpdate(
    {_id: fileId},
    {$set: change},
    {returnDocument: 'after', includeResultMetadata: true})
  return rs.value
}
export const remove = async (fileId: ObjectId): Promise<any> => {
  return Model.Files.deleteOne({_id: fileId});
}
export const getUploadForm = async (filename: string, mimeType: string, folder: string) => {
  try {
    const config = {
      credentialConfig: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT
      },
      storageConfig: {
        bucket: process.env.S3_BUCKET,
        expiryTime: 3600
      }
    };
    const s3 = new S3(config);
    const uploadForm: any = await s3.getUploadForm({
      folder,
      originalname: filename,
      mimeType: mimeType
    });
    uploadForm.imageUrl = `${process.env.S3_BUCKET}/${uploadForm.fields.Key}`;
    return uploadForm
  } catch (e) {
    getLogger().error(e.message, {fn: 'file.getUploadForm', folder, filename, mimeType})
    throw e;
  }
}