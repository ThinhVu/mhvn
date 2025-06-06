import {create, update, remove} from "../logic/file-system/file";
import {addFileToFolder, removeFileFromFolder} from "../logic/file-system/folder";
import DataParser from "../utils/data-parser";
import {requireAdmin, requireUser, UserProps} from "../middlewares/auth";
import $ from "../utils/safe-call";
import {Router, Request} from 'hyper-express';
import axios from "axios";
import _ from 'lodash';
import {rateLimitByUser} from "../middlewares/rate-limit";

import {m2ms} from "../utils/date-time-util";

export default async function useFile(parentRouter: Router) {
  console.log('[route] useFile')

  const router = new Router()

  router.post('/', {middlewares: [requireAdmin]}, $(async (req) => {
    const {name, src, size, type, thumbnail, folderId} = await req.json()
    const file = await create({name, src, size, type, thumbnail, createdAt: new Date()})
    if (folderId)
      await addFileToFolder(DataParser.oid(folderId), file._id)
    return file
  }))
  router.put('/:id', {middlewares: [requireAdmin]}, $(async (req) => {
    const {id} = req.path_parameters
    const {change} = await req.json()
    return update(DataParser.oid(id), change)
  }))
  router.delete('/:id', {
    middlewares: [requireAdmin]
  }, $(async (req: Request<UserProps>) => {
    const {id} = req.path_parameters
    const folderId = DataParser.oid(req.query_parameters.folderId, false)
    const fileId = DataParser.oid(id)
    const data = await remove(fileId)
    if (folderId)
      await removeFileFromFolder(folderId, fileId)
    return data
  }))
  router.get('/upload-form', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req) => {
    const {filename, mimeType} = req.query_parameters;
    const folder = _.get(req.query_parameters, 'folder', 'user-data')
    const url = `${process.env.FS_API_ENDPOINT}/upload-form?folder=${folder}&filename=${filename}&mimeType=${mimeType}&apiKey=${process.env.FS_API_KEY}`
    const {data} = await axios.get(url)
    return data
  }))

  parentRouter.use('/file', router)
}
