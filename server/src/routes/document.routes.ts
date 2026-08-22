import { Router } from 'express';
import multer from 'multer';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  resetDocumentStore,
} from '../controllers/document.controller';

const router = Router();

// Configure Multer for in-memory temporary storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit files to 10MB
  },
  fileFilter: (req, file, cb) => {
    const isTxt = file.mimetype === 'text/plain' || file.originalname.endsWith('.txt');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf');
    
    if (isTxt || isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Only plain text (.txt) and PDF (.pdf) documents are supported.'));
    }
  },
});

router.get('/', getDocuments);
router.post('/upload', upload.single('file'), uploadDocument);
router.delete('/:id', deleteDocument);
router.post('/reset', resetDocumentStore);

export default router;
