import {IFile} from '../../db/models/file-system/file';
import {ObjectId} from "mongodb";
import {Model} from "../../db/models";

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
