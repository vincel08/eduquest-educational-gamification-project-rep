import AiContentService from '../services/AiContentService.js';
import { successResponse } from '../utils/apiResponse.js';

const AiContentController = {
  async extract(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF, DOCX, PPTX, PPT, or TXT file',
          errors: [],
        });
      }

      const data = await AiContentService.extractDocument(req.file);
      return successResponse(res, 'Document text extracted', data, 200);
    } catch (error) {
      return next(error);
    }
  },

  async generate(req, res, next) {
    try {
      const data = await AiContentService.generate(req.body, req.user);
      return successResponse(res, 'AI content generated', data, 200);
    } catch (error) {
      return next(error);
    }
  },

  async save(req, res, next) {
    try {
      const data = await AiContentService.save(req.body, req.user);
      return successResponse(res, 'AI content saved', data, 201);
    } catch (error) {
      return next(error);
    }
  },
};

export default AiContentController;
