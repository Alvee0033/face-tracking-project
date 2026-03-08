import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    OneToOne, JoinColumn, OneToMany, ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';

@Entity('candidate_profiles')
export class CandidateProfile {
    @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
    @Column() userId: string;
    @OneToOne(() => User) @JoinColumn({ name: 'userId' }) user: User;
    @ApiProperty() @Column({ nullable: true }) headline: string;
    @ApiProperty() @Column({ nullable: true, type: 'text' }) bio: string;
    @ApiProperty() @Column({ nullable: true }) dateOfBirth: string;
    @ApiProperty() @Column({ nullable: true }) profileType: string;
    @ApiProperty() @Column({ nullable: true }) currentEducationStatus: string;
    @ApiProperty() @Column({ nullable: true }) expectedGraduationDate: string;
    @ApiProperty() @Column({ nullable: true }) country: string;
    @ApiProperty() @Column({ nullable: true }) city: string;
    @ApiProperty() @Column({ nullable: true }) currentJobTitle: string;
    @ApiProperty() @Column({ nullable: true }) currentCompany: string;
    @ApiProperty() @Column({ nullable: true }) yearsOfExperience: string;
    @ApiProperty() @Column({ nullable: true }) portfolioWebsite: string;
    @ApiProperty() @Column({ nullable: true }) linkedinUrl: string;
    @ApiProperty() @Column({ nullable: true }) githubUrl: string;
    @ApiProperty() @Column({ nullable: true }) behanceUrl: string;
    @ApiProperty() @Column({ nullable: true }) resumeUrl: string;
    @ApiProperty() @Column({ nullable: true, type: 'text' }) resumeText: string;
    @ApiProperty() @Column({ default: false }) willingToRelocate: boolean;
    @ApiProperty() @Column({ nullable: true, type: 'simple-array' }) preferredWorkModes: string[];
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;

    @OneToMany('CandidateSkill', (skill: any) => skill.profile) skills: any[];
    @OneToMany('CandidateExperience', (exp: any) => exp.profile) experience: any[];
    @OneToMany('CandidateEducation', (edu: any) => edu.profile) education: any[];
    @OneToMany('CandidateProject', (proj: any) => proj.profile) projects: any[];
    @OneToMany('CandidateCertification', (cert: any) => cert.profile) certifications: any[];
    @OneToOne('JobPreferences', (prefs: any) => prefs.profile) jobPreferences: any;
}

@Entity('job_preferences')
export class JobPreferences {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateProfileId: string;
    @OneToOne('CandidateProfile', (p: any) => p.jobPreferences) @JoinColumn({ name: 'candidateProfileId' }) profile: any;
    @Column({ nullable: true, type: 'simple-array' }) lookingFor: string[];
    @Column({ nullable: true, type: 'simple-array' }) preferredRoles: string[];
    @Column({ nullable: true, type: 'simple-array' }) preferredCountries: string[];
    @Column({ nullable: true, type: 'int' }) expectedSalaryMin: number;
    @Column({ nullable: true, type: 'int' }) expectedSalaryMax: number;
    @Column({ default: 'USD' }) salaryCurrency: string;
    @Column({ nullable: true }) availableFrom: string;
    @Column({ nullable: true }) noticePeriod: string;
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
}

@Entity('recruiter_profiles')
export class RecruiterProfile {
    @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
    @Column() userId: string;
    @OneToOne(() => User) @JoinColumn({ name: 'userId' }) user: User;
    @ApiProperty() @Column({ nullable: true }) companyName: string;
    @ApiProperty() @Column({ nullable: true }) companyLogoUrl: string;
    @ApiProperty() @Column({ nullable: true }) companyWebsite: string;
    @ApiProperty() @Column({ nullable: true }) companySize: string;
    @ApiProperty() @Column({ nullable: true }) industry: string;
    @ApiProperty() @Column({ nullable: true, type: 'text' }) companyDescription: string;
    @ApiProperty() @Column({ nullable: true }) position: string;
    @ApiProperty() @Column({ nullable: true }) country: string;
    @ApiProperty() @Column({ nullable: true }) city: string;
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
}

@Entity('candidate_skills')
export class CandidateSkill {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateProfileId: string;
    @ManyToOne('CandidateProfile', (p: any) => p.skills) @JoinColumn({ name: 'candidateProfileId' }) profile: any;
    @Column() skillName: string;
    @Column({ default: 'intermediate' }) skillLevel: string;
    @Column({ default: false }) isVerified: boolean;
    @CreateDateColumn() createdAt: Date;
}

@Entity('candidate_experience')
export class CandidateExperience {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateProfileId: string;
    @ManyToOne('CandidateProfile', (p: any) => p.experience) @JoinColumn({ name: 'candidateProfileId' }) profile: any;
    @Column() jobTitle: string;
    @Column() company: string;
    @Column({ nullable: true, type: 'text' }) description: string;
    @Column({ nullable: true }) startDate: string;
    @Column({ nullable: true }) endDate: string;
    @Column({ default: false }) isCurrent: boolean;
    @CreateDateColumn() createdAt: Date;
}

@Entity('candidate_education')
export class CandidateEducation {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateProfileId: string;
    @ManyToOne('CandidateProfile', (p: any) => p.education) @JoinColumn({ name: 'candidateProfileId' }) profile: any;
    @Column() degree: string;
    @Column() fieldOfStudy: string;
    @Column() institution: string;
    @Column({ nullable: true }) startDate: string;
    @Column({ nullable: true }) endDate: string;
    @CreateDateColumn() createdAt: Date;
}

@Entity('candidate_projects')
export class CandidateProject {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateProfileId: string;
    @ManyToOne('CandidateProfile', (p: any) => p.projects) @JoinColumn({ name: 'candidateProfileId' }) profile: any;
    @Column() projectTitle: string;
    @Column({ nullable: true }) projectType: string;
    @Column({ nullable: true }) organization: string;
    @Column({ nullable: true, type: 'text' }) description: string;
    @Column({ nullable: true }) startDate: string;
    @Column({ nullable: true }) endDate: string;
    @Column({ default: false }) isOngoing: boolean;
    @Column({ nullable: true }) projectUrl: string;
    @Column({ nullable: true, type: 'simple-array' }) technologiesUsed: string[];
    @CreateDateColumn() createdAt: Date;
}

@Entity('candidate_certifications')
export class CandidateCertification {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateProfileId: string;
    @ManyToOne('CandidateProfile', (p: any) => p.certifications) @JoinColumn({ name: 'candidateProfileId' }) profile: any;
    @Column() certificationName: string;
    @Column() issuingOrganization: string;
    @Column({ nullable: true }) issueDate: string;
    @Column({ nullable: true }) expirationDate: string;
    @Column({ nullable: true }) credentialId: string;
    @Column({ nullable: true }) credentialUrl: string;
    @CreateDateColumn() createdAt: Date;
}
