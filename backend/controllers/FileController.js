import FileAccessService from '../services/FileAccessService.js';
import { errorResponse } from '../utils/apiResponse.js';

async function sendAuthorizedFile(res, next, loader) {
  try {
    const fileInfo = await loader();
    await FileAccessService.streamFile(res, fileInfo);
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
    return undefined;
  }
  return undefined;
}

const FileController = {
  async material(req, res, next) {
    return sendAuthorizedFile(res, next, () => (
      FileAccessService.getAuthorizedMaterialFile(req.params.materialId, req.user)
    ));
  },

  async questionImage(req, res, next) {
    return sendAuthorizedFile(res, next, () => (
      FileAccessService.getAuthorizedQuestionImage(req.params.questionId, req.user)
    ));
  },

  async avatar(req, res, next) {
    return sendAuthorizedFile(res, next, () => (
      FileAccessService.getAuthorizedAvatarFile(req.params.userId, req.user)
    ));
  },

  async aiSource(req, res, next) {
    return sendAuthorizedFile(res, next, () => (
      FileAccessService.getAuthorizedAiSourceFile(req.params.generationId, req.user)
    ));
  },

  /** Reject legacy public /uploads probes with a clear auth error (no file disclosure). */
  async legacyUploadsBlocked(req, res) {
    return errorResponse(res, 'Authentication required', 401);
  },
};

export default FileController;
