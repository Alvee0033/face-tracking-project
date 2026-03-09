import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, UseInterceptors, UploadedFile, NotFoundException } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('profiles')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('profiles')
export class ProfilesController {
    constructor(private service: ProfilesService) { }

    @Post('candidate/upload-resume')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiConsumes('multipart/form-data')
    @ApiBody({ schema: { type: 'object', properties: { resume: { type: 'string', format: 'binary' } } } })
    @UseInterceptors(FileInterceptor('resume'))
    async uploadResume(@Request() req, @UploadedFile() file: any) {
        // In a real app we'd save the file to S3/Cloudinary. For now, simulate URL.
        const resumeUrl = `https://mock-storage.com/${req.user.id}/${file.originalname}`;
        return this.service.updateCandidateProfile(req.user.id, { resumeUrl });
    }

    @Post('candidate/job-preferences')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update job preferences' })
    updateJobPreferences(@Request() req, @Body() dto: any) {
        return this.service.updateJobPreferences(req.user.id, dto);
    }

    @Get('candidate/me')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get current candidate profile' })
    myProfile(@Request() req) { return this.service.getCandidateProfile(req.user.id); }

    @Put('candidate/me')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update candidate profile' })
    updateCandidate(@Request() req, @Body() dto: any) {
        return this.service.updateCandidateProfile(req.user.id, dto);
    }

    @Get('candidate/:userId')
    @CacheTTL(300) // Cache public profiles for 5 minutes
    getCandidateById(@Param('userId') userId: string) { return this.service.getCandidateProfile(userId); }

    @Post('candidate')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update candidate profile (alias)' })
    updateCandidateAlias(@Request() req, @Body() dto: any) {
        return this.service.updateCandidateProfile(req.user.id, dto);
    }

    @Get('recruiter/me')
    @Roles('recruiter') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get current recruiter profile' })
    myRecruiterProfile(@Request() req) { return this.service.getRecruiterProfile(req.user.id); }

    @Post('recruiter')
    @Roles('recruiter') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update recruiter profile (alias)' })
    updateRecruiterAlias(@Request() req, @Body() dto: any) {
        return this.service.updateRecruiterProfile(req.user.id, dto);
    }

    @Put('recruiter/me')
    @Roles('recruiter') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update recruiter profile' })
    updateRecruiter(@Request() req, @Body() dto: any) {
        return this.service.updateRecruiterProfile(req.user.id, dto);
    }

    @Get('recruiter/:userId')
    @ApiOperation({ summary: 'Get recruiter profile by user ID' })
    getRecruiterById(@Param('userId') userId: string) { return this.service.getRecruiterProfile(userId); }

    /**
     * Endpoint to list all candidate profiles.
     * @param page Page number
     * @param limit Items per page
     * @returns Paginated list of candidates
     */
    @Get('candidates')
    @ApiOperation({ summary: 'List all candidate profiles' })
    listCandidates(@Query('page') page: number, @Query('limit') limit: number): Promise<{ data: any[]; total: number }> {
        return this.service.listCandidates(page, limit);
    }

    @Post('candidate/skills')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Add a skill to candidate profile' })
    addSkill(@Request() req, @Body() dto: { skillName: string; skillLevel: string }) {
        return this.service.addSkill(req.user.id, dto);
    }

    @Put('candidate/skills/:skillId')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update a skill' })
    updateSkill(@Param('skillId') id: string, @Body() dto: any) {
        return this.service.updateSkill(id, dto);
    }

    @Delete('candidate/skills/:skillId')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Remove a skill' })
    removeSkill(@Param('skillId') id: string) { return this.service.deleteSkill(id); }

    @Get('candidate/skills/unverified')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get unverified skills' })
    getUnverifiedSkills(@Request() req) {
        return this.service.getUnverifiedSkills(req.user.id);
    }

    @Post('candidate/skills/unverified/:skillId/exam')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Generate skill verification exam' })
    generateSkillExam(@Param('skillId') skillId: string) {
        return this.service.generateSkillExam(skillId);
    }

    @Post('candidate/skills/unverified/submit-exam')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Submit skill verification exam' })
    submitSkillExam(@Request() req, @Body() dto: { examId: string; answers: any[] }) {
        return this.service.submitSkillExam(req.user.id, dto);
    }

    @Post('candidate/experience')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Add experience' })
    addExperience(@Request() req, @Body() dto: any) { return this.service.addExperience(req.user.id, dto); }

    @Put('candidate/experience/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update experience' })
    updateExperience(@Param('id') id: string, @Body() dto: any) { return this.service.updateExperience(id, dto); }

    @Delete('candidate/experience/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Delete experience' })
    deleteExperience(@Param('id') id: string) { return this.service.deleteExperience(id); }

    @Post('candidate/education')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Add education' })
    addEducation(@Request() req, @Body() dto: any) { return this.service.addEducation(req.user.id, dto); }

    @Put('candidate/education/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update education' })
    updateEducation(@Param('id') id: string, @Body() dto: any) { return this.service.updateEducation(id, dto); }

    @Delete('candidate/education/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Delete education' })
    deleteEducation(@Param('id') id: string) { return this.service.deleteEducation(id); }

    @Post('candidate/projects')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Add project' })
    addProject(@Request() req, @Body() dto: any) { return this.service.addProject(req.user.id, dto); }

    @Put('candidate/projects/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update project' })
    updateProject(@Param('id') id: string, @Body() dto: any) { return this.service.updateProject(id, dto); }

    @Delete('candidate/projects/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Delete project' })
    deleteProject(@Param('id') id: string) { return this.service.deleteProject(id); }

    @Post('candidate/certifications')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Add certification' })
    addCertification(@Request() req, @Body() dto: any) { return this.service.addCertification(req.user.id, dto); }

    @Put('candidate/certifications/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update certification' })
    updateCertification(@Param('id') id: string, @Body() dto: any) { return this.service.updateCertification(id, dto); }

    @Delete('candidate/certifications/:id')
    @Roles('candidate') @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Delete certification' })
    deleteCertification(@Param('id') id: string) { return this.service.deleteCertification(id); }

    @Get('candidate/:userId/download-resume')
    @ApiOperation({ summary: 'Download candidate resume' })
    async downloadResume(@Param('userId') userId: string) {
        const profile = await this.service.getCandidateProfile(userId);
        if (!profile || !profile.resumeUrl) throw new NotFoundException('Resume not found');
        return { url: profile.resumeUrl };
    }
}
