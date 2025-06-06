import _ from 'lodash';
import {IFolder} from "../../db/models/file-system/folder";
import {ObjectId} from "mongodb";
import {CollNames, Model} from "../../db/models";

export const getFolderTree = async () => {
  const folders = await Model.Folders.find({}, {projection: {files: 0}}).toArray()

  const folderMap = new Map<string, IFolder & { folders?: Array<IFolder> }>();
  for (const folder of folders)
    folderMap.set(folder._id.toString(), folder);

  const folderTree = []
  for (const folder of folders) {
    if (folder.parent) {
      const parentFolder = folderMap.get(folder.parent.toString());
      if (!parentFolder) continue;
      if (!parentFolder.folders) parentFolder.folders = [];
      parentFolder.folders.push(folder);
    } else {
      folderTree.push(folder)
    }
  }
  return folderTree;
}
export const getFiles = async (folderId: ObjectId) => {
  const folders = await Model.Folders.aggregate([
    {$match: {_id: folderId}},
    {$lookup: {from: CollNames.Files, localField: 'files', foreignField: '_id', as: 'files'}}
  ]).toArray() as IFolder[];
  if (_.isEmpty(folders))
    throw `Folder with id "${folderId}" is not exists.`;
  return folders[0].files;
}
export const create = async (name: string, parent: ObjectId): Promise<IFolder> => {
  const data: IFolder = {name, parent}
  const {insertedId} = await Model.Folders.insertOne({name, parent})
  data._id = insertedId
  return data
}
export const update = async (folderId: ObjectId, change: IFolder) => {
  const rs = await Model.Folders.findOneAndUpdate(
    {_id: folderId},
    {$set: change},
    {returnDocument: 'after', includeResultMetadata: true})
  return rs.value
}
export const remove = async (folderId: ObjectId) => {
  return Model.Folders.deleteOne({_id: folderId})
}
export const addFileToFolder = async (folderId: ObjectId, fileId: ObjectId) => {
  const rs = await Model.Folders.findOneAndUpdate(
    {_id: folderId},
    {$push: {files: fileId}},
    {returnDocument: 'after', includeResultMetadata: true})
  return rs.value
}
export const removeFileFromFolder = async (folderId: ObjectId, fileId: ObjectId) => {
  const rs = await Model.Folders.findOneAndUpdate(
    {_id: folderId},
    {$pull: {files: fileId}},
    {returnDocument: 'after', includeResultMetadata: true})
  return rs.value
}
