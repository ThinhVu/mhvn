import To from "../utils/data-parser"
import {requireAdmin, requireUser} from "../middlewares/auth"
import $ from "../utils/safe-call"
import {
  addFileToFolder, removeFileFromFolder, getFolderTree,
  getFiles, create, update, remove
} from "../logic/file-system/folder"
import {Router} from 'hyper-express';

export default async function useFolder(parentRouter: Router) {
  console.log('[route] useFolder')

  const router = new Router()

  router.get('/', {middlewares: [requireUser]}, $(async () => getFolderTree()))
  router.post('/', {middlewares: [requireAdmin]}, $(async req => {
    const {name, parent} = await req.json();
    return create(name, To.oid(parent, false))
  }))
  router.get('/:id', {middlewares: [requireUser]}, $(async req => {
    const folderId = To.oid(req.path_parameters.id)
    return getFiles(folderId)
  }))
  router.put('/:id', {middlewares: [requireAdmin]}, $(async req => {
    const folderId = To.oid(req.path_parameters.id)
    const {name} = await req.json()
    return update(folderId, {name})
  }))
  router.delete('/:id', {middlewares: [requireAdmin]}, $(async req => {
    const folderId = To.oid(req.path_parameters.id)
    return remove(folderId)
  }))
  router.post('/add-file', {middlewares: [requireAdmin]}, $(async req => {
    const {folderId, fileId} = await req.json()
    return addFileToFolder(To.oid(folderId), To.oid(fileId))
  }))
  router.post('/remove-file', {middlewares: [requireAdmin]}, $(async req => {
    const {folderId, fileId} = await req.json()
    return removeFileFromFolder(To.oid(folderId), To.oid(fileId))
  }))

  parentRouter.use('/folder', router)
}
