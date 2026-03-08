import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('upload')
export class UploadController {
    @Post()
    @ApiOperation({ summary: 'Upload a file (PDF, DOCX, image)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        return {
            originalName: file?.originalname,
            size: file?.size,
            mimeType: file?.mimetype,
            message: 'File uploaded successfully',
        };
    }
}
