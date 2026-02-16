import { jsPDF } from 'jspdf';

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  portfolio: string;
  summary: string;
}

interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  gpa: string;
  startDate: string;
  endDate: string;
}

interface ExperienceEntry {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface ProjectEntry {
  name: string;
  technologies: string;
  link: string;
  description: string;
}

interface CertificationEntry {
  name: string;
  organization: string;
  dateIssued: string;
  credentialId: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  skills: string;
  educationEntries: EducationEntry[];
  experienceEntries: ExperienceEntry[];
  projectEntries: ProjectEntry[];
  certificationEntries: CertificationEntry[];
}

export function generateResumePDF(data: ResumeData): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 6;
  let yPos = 20;

  // Helper functions
  const centerText = (text: string, y: number, fontSize = 12, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  const addText = (text: string, x: number, y: number, fontSize = 11, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(text, x, y);
  };

  const addBulletPoint = (text: string, x: number, y: number, maxWidth: number) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('•', x, y);
    const wrappedText = doc.splitTextToSize(text, maxWidth);
    doc.text(wrappedText, x + 5, y);
    return wrappedText.length * lineHeight;
  };

  const addSectionHeader = (title: string, y: number) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    return y + 8;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // 1. Header - Name
  centerText(data.personalInfo.fullName.toUpperCase(), yPos, 18, true);
  yPos += 8;

  // 2. Contact Info
  const contactParts = [];
  if (data.personalInfo.address) contactParts.push(data.personalInfo.address);
  if (data.personalInfo.phone) contactParts.push(data.personalInfo.phone);
  if (data.personalInfo.email) contactParts.push(data.personalInfo.email);
  const contactLine = contactParts.join(' | ');
  centerText(contactLine, yPos, 10);
  yPos += 10;

  // Add LinkedIn and Portfolio if present
  if (data.personalInfo.linkedin || data.personalInfo.portfolio) {
    const links = [];
    if (data.personalInfo.linkedin) links.push(data.personalInfo.linkedin);
    if (data.personalInfo.portfolio) links.push(data.personalInfo.portfolio);
    centerText(links.join(' | '), yPos, 9);
    yPos += 10;
  }

  // 3. Professional Summary
  if (data.personalInfo.summary) {
    checkPageBreak(30);
    yPos = addSectionHeader('PROFESSIONAL SUMMARY', yPos);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(data.personalInfo.summary, pageWidth - 2 * margin);
    doc.text(summaryLines, margin, yPos);
    yPos += summaryLines.length * lineHeight + 8;
  }

  // 4. Core Skills
  if (data.skills.trim()) {
    checkPageBreak(30);
    yPos = addSectionHeader('CORE SKILLS', yPos);
    const skillsList = data.skills.split('\n').filter(s => s.trim());
    skillsList.forEach(skill => {
      checkPageBreak(10);
      const height = addBulletPoint(skill.trim(), margin, yPos, pageWidth - 2 * margin - 5);
      yPos += height;
    });
    yPos += 5;
  }

  // 5. Work Experience
  const validExperiences = data.experienceEntries.filter(e => e.company && e.position);
  if (validExperiences.length > 0) {
    checkPageBreak(30);
    yPos = addSectionHeader('WORK EXPERIENCE', yPos);
    
    validExperiences.forEach((exp, index) => {
      checkPageBreak(25);
      
      // Position (bold)
      addText(exp.position, margin, yPos, 11, true);
      yPos += lineHeight;
      
      // Company and dates
      const dateRange = exp.current 
        ? `${exp.startDate || ''} – Present`.trim()
        : `${exp.startDate || ''} – ${exp.endDate || ''}`.trim();
      addText(`${exp.company}${dateRange ? ` – ${dateRange}` : ''}`, margin, yPos, 11);
      yPos += lineHeight + 2;
      
      // Description bullet points
      if (exp.description) {
        const descriptions = exp.description.split('\n').filter(d => d.trim());
        descriptions.forEach(desc => {
          checkPageBreak(10);
          const height = addBulletPoint(desc.trim(), margin, yPos, pageWidth - 2 * margin - 5);
          yPos += height;
        });
      }
      
      yPos += 5;
    });
  }

  // 6. Projects (if any)
  const validProjects = data.projectEntries.filter(p => p.name || p.description);
  if (validProjects.length > 0) {
    checkPageBreak(30);
    yPos = addSectionHeader('PROJECTS', yPos);
    
    validProjects.forEach(project => {
      checkPageBreak(20);
      
      if (project.name) {
        addText(project.name, margin, yPos, 11, true);
        yPos += lineHeight;
      }
      
      if (project.technologies) {
        addText(`Technologies: ${project.technologies}`, margin, yPos, 10);
        yPos += lineHeight;
      }
      
      if (project.link) {
        addText(`Link: ${project.link}`, margin, yPos, 10);
        yPos += lineHeight;
      }
      
      if (project.description) {
        const descLines = doc.splitTextToSize(project.description, pageWidth - 2 * margin);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * lineHeight;
      }
      
      yPos += 5;
    });
  }

  // 7. Education
  const validEducation = data.educationEntries.filter(e => e.school || e.degree);
  if (validEducation.length > 0) {
    checkPageBreak(30);
    yPos = addSectionHeader('EDUCATION', yPos);
    
    validEducation.forEach(edu => {
      checkPageBreak(15);
      
      // Degree and Field
      const degreeLine = [edu.degree, edu.field].filter(Boolean).join(' in ');
      if (degreeLine) {
        addText(degreeLine, margin, yPos, 11, true);
        yPos += lineHeight;
      }
      
      // School and Year
      const endYear = edu.endDate ? ` (${edu.endDate.split('-')[0]})` : '';
      addText(`${edu.school}${endYear}`, margin, yPos, 11);
      yPos += lineHeight;
      
      if (edu.gpa) {
        addText(`GPA: ${edu.gpa}`, margin, yPos, 10);
        yPos += lineHeight;
      }
      
      yPos += 3;
    });
  }

  // 8. Certifications
  const validCerts = data.certificationEntries.filter(c => c.name);
  if (validCerts.length > 0) {
    checkPageBreak(30);
    yPos = addSectionHeader('CERTIFICATIONS (Optional)', yPos);
    
    validCerts.forEach(cert => {
      checkPageBreak(10);
      const certText = cert.organization 
        ? `${cert.name} – ${cert.organization}${cert.dateIssued ? ` (${cert.dateIssued})` : ''}`
        : cert.name;
      const height = addBulletPoint(certText, margin, yPos, pageWidth - 2 * margin - 5);
      yPos += height;
    });
  }

  return doc.output('blob');
}
