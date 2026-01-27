import React from 'react';
import { GraduationCap, Briefcase, Code, FolderGit2, ExternalLink, Star, FileText } from 'lucide-react';
import { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const ai = candidate.ai_analysis;
  const cvLink = candidate.qr_content.startsWith('http') ? candidate.qr_content : null;

  const hasEducation = ai && (ai.educationLevel || ai.educationField || ai.educationUniversity);
  const hasExperience = ai && (ai.experienceSummary || (ai.previousRoles && ai.previousRoles.length > 0));
  const hasSkills = ai && ai.technicalSkills && ai.technicalSkills.length > 0;
  const hasProjects = ai && ai.projects && ai.projects.length > 0;

  return (
    <div className="space-y-4">
      {/* CV Link — always visible regardless of analysis status */}
      {cvLink && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText size={14} />
            CV Link
          </h4>
          <a href={cvLink} target="_blank" rel="noreferrer" className="flex items-center text-sm text-brand-600 hover:underline truncate">
            <ExternalLink size={14} className="mr-2 shrink-0" />
            <span className="truncate">{cvLink}</span>
          </a>
          {candidate.resolved_url && candidate.resolved_url !== cvLink && (
            <a href={candidate.resolved_url} target="_blank" rel="noreferrer" className="flex items-center text-xs text-slate-500 hover:underline truncate mt-2">
              <ExternalLink size={12} className="mr-1.5 shrink-0" />
              <span className="truncate">{candidate.resolved_url}</span>
            </a>
          )}
          {candidate.pdf_storage_path && (
            <a href={candidate.pdf_storage_path} target="_blank" rel="noreferrer" className="flex items-center text-xs text-green-600 hover:underline truncate mt-2">
              <ExternalLink size={12} className="mr-1.5 shrink-0" />
              <span className="truncate">View on Google Drive</span>
            </a>
          )}
        </div>
      )}

      {/* AI-dependent sections — only render when analysis is complete */}
      {ai && (
        <>
          {/* Summary */}
          {ai.summary && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-600 leading-relaxed text-sm">{ai.summary}</p>
            </div>
          )}

          {/* Key Points */}
          {ai.keyPoints && ai.keyPoints.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Highlights</h4>
              <div className="flex flex-wrap gap-2">
                {ai.keyPoints.map((point, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {hasEducation && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <GraduationCap size={14} />
                Education
              </h4>
              <div className="space-y-1">
                {ai.educationLevel && ai.educationField && (
                  <p className="text-sm font-medium text-slate-800">
                    {ai.educationLevel} in {ai.educationField}
                  </p>
                )}
                {ai.educationUniversity && (
                  <p className="text-sm text-slate-600">{ai.educationUniversity}</p>
                )}
                {ai.educationDetails && (
                  <p className="text-xs text-slate-500 mt-1">{ai.educationDetails}</p>
                )}
              </div>
            </div>
          )}

          {/* Experience */}
          {hasExperience && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Briefcase size={14} />
                Experience
                {ai.yearsOfExperience != null && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    ({ai.yearsOfExperience} {ai.yearsOfExperience === 1 ? 'year' : 'years'})
                  </span>
                )}
              </h4>
              {ai.experienceSummary && (
                <p className="text-sm text-slate-600 mb-3">{ai.experienceSummary}</p>
              )}
              {ai.previousRoles && ai.previousRoles.length > 0 && (
                <div className="space-y-2">
                  {ai.previousRoles.map((role, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{role.title}</p>
                        <p className="text-xs text-slate-500">
                          {role.company}{role.duration ? ` · ${role.duration}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Technical Skills */}
          {hasSkills && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Code size={14} />
                Technical Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {ai.technicalSkills!.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {hasProjects && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FolderGit2 size={14} />
                Projects
              </h4>
              <div className="space-y-3">
                {ai.projects!.map((project, i) => (
                  <div key={i} className="py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{project.name}</p>
                      {project.url && (
                        <a href={project.url} target="_blank" rel="noreferrer" className="text-brand-500 hover:text-brand-700">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Assessment */}
          {ai.overallAssessment && (
            <div className="bg-amber-50 rounded-2xl p-5 shadow-sm border border-amber-100">
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Star size={14} />
                AI Assessment
              </h4>
              <p className="text-sm text-amber-900 leading-relaxed">{ai.overallAssessment}</p>
            </div>
          )}

          {/* Source URLs */}
          {ai.urls && ai.urls.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sources</h4>
              <div className="space-y-2">
                {ai.urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-brand-600 hover:underline truncate">
                    <ExternalLink size={14} className="mr-2 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CandidateCard;
