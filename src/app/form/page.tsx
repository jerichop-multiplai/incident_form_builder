'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import RichTextEditor from '@/components/RichTextEditor';
import RichTextArea from '@/components/RichTextArea';
import DocumentPreview from '@/components/DocumentPreview';
import { generateIncidentReportDocx } from '@/lib/docx-generator';

interface UserDetails {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  position: string;
  company: string;
  created_at?: string;
  [key: string]: any;
}

interface EmployeeDetails {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  position: string;
  company: string;
  created_at?: string;
}

interface Attachment {
  id: string;
  nameOrLink: string;
  description: string;
}

type ImpactCategory = 'Client' | 'GoTeam' | 'Peers' | 'Management' | 'Others';

const IMPACT_CATEGORIES: ImpactCategory[] = ['Client', 'GoTeam', 'Peers', 'Management', 'Others'];

type EnhancingField = 
  | 'incidentDetails' 
  | 'findings' 
  | 'policyViolation' 
  | 'impactDescription' 
  | `attachment_${string}`;

export default function FormPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  
  // Section 1: General Information
  const [datePrepared, setDatePrepared] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Section 2: Employee Details (Subject)
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [employeeLookupLoading, setEmployeeLookupLoading] = useState(false);
  const [employeeLookupError, setEmployeeLookupError] = useState<string>('');

  // Section 3: Description of Incidents
  // A. Core Details
  const [incidentWhat, setIncidentWhat] = useState<string>('');
  const [incidentLocation, setIncidentLocation] = useState<string>('');
  const [incidentDateTime, setIncidentDateTime] = useState<string>('');

  // B. Narrative Fields
  const [incidentDetails, setIncidentDetails] = useState<string>('');
  const [findings, setFindings] = useState<string>('');
  const [policyViolation, setPolicyViolation] = useState<string>('');

  // C. Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // D. Impact
  const [impactCategories, setImpactCategories] = useState<ImpactCategory[]>([]);
  const [impactOthersSpecify, setImpactOthersSpecify] = useState<string>('');
  const [impactDescription, setImpactDescription] = useState<string>('');

  // Section 4 & 5: Signatories
  // Attested By (lookup via employee webhook)
  const [attestedById, setAttestedById] = useState<string>('');
  const [attestedByDetails, setAttestedByDetails] = useState<EmployeeDetails | null>(null);
  const [attestedByLookupLoading, setAttestedByLookupLoading] = useState(false);
  const [attestedByLookupError, setAttestedByLookupError] = useState<string>('');

  // Helper function to toggle impact category
  const toggleImpactCategory = (category: ImpactCategory) => {
    setImpactCategories(prev => {
      if (prev.includes(category)) {
        // Remove category
        const newCategories = prev.filter(c => c !== category);
        // Clear "Others" specify if Others is removed
        if (category === 'Others') {
          setImpactOthersSpecify('');
        }
        return newCategories;
      } else {
        // Add category
        return [...prev, category];
      }
    });
  };

  // Get formatted impact context for AI
  const getImpactContext = () => {
    const categories = impactCategories.join(', ');
    const othersText = impactCategories.includes('Others') && impactOthersSpecify 
      ? ` (Others: ${impactOthersSpecify})` 
      : '';
    return `impact_description - Impacted parties: ${categories}${othersText}`;
  };

  // AI Enhancement state
  const [enhancingField, setEnhancingField] = useState<EnhancingField | null>(null);

  // Document Generation state
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [docError, setDocError] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Preview visibility for mobile
  const [showPreview, setShowPreview] = useState(false);

  // Check if form is complete enough to submit
  const canSubmit = Boolean(
    datePrepared &&
    employeeDetails &&
    incidentWhat.trim() &&
    incidentLocation.trim() &&
    incidentDateTime &&
    incidentDetails.trim() &&
    impactCategories.length > 0 &&
    impactDescription.trim() &&
    attestedByDetails
  );

  useEffect(() => {
    // Check authentication
    const userId = sessionStorage.getItem('userId');
    const userEmail = sessionStorage.getItem('userEmail');
    const userDetailsStr = sessionStorage.getItem('userDetails');

    if (!userId || !userEmail) {
      router.push('/login');
    } else {
      if (userDetailsStr) {
        try {
          const details = JSON.parse(userDetailsStr);
          setUser(details);
        } catch {
          setUser({ 
            id: parseInt(userId), 
            employee_id: 0,
            employee_name: '',
            employee_email: userEmail,
            position: '',
            company: ''
          });
        }
      }
    }
  }, [router]);

  const formatFullName = (details: { employee_name: string }) => {
    return details.employee_name || '';
  };

  const handleEmployeeLookup = async () => {
    if (!employeeId.trim()) {
      setEmployeeLookupError('Please enter an Employee ID');
      return;
    }

    setEmployeeLookupLoading(true);
    setEmployeeLookupError('');
    setEmployeeDetails(null);

    try {
      const response = await axios.post('/api/employee/lookup', {
        employeeId: employeeId.trim()
      });

      if (response.data.success && response.data.employee) {
        setEmployeeDetails(response.data.employee);
      } else {
        setEmployeeLookupError(response.data.error || 'Employee not found');
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setEmployeeLookupError(err.response.data.error);
      } else {
        setEmployeeLookupError('Failed to lookup employee. Please try again.');
      }
    } finally {
      setEmployeeLookupLoading(false);
    }
  };

  // Attested By Employee Lookup
  const handleAttestedByLookup = async () => {
    if (!attestedById.trim()) {
      setAttestedByLookupError('Please enter an Employee ID');
      return;
    }

    setAttestedByLookupLoading(true);
    setAttestedByLookupError('');
    setAttestedByDetails(null);

    try {
      const response = await axios.post('/api/employee/lookup', {
        employeeId: attestedById.trim()
      });

      if (response.data.success && response.data.employee) {
        setAttestedByDetails(response.data.employee);
      } else {
        setAttestedByLookupError(response.data.error || 'Employee not found');
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setAttestedByLookupError(err.response.data.error);
      } else {
        setAttestedByLookupError('Failed to lookup employee. Please try again.');
      }
    } finally {
      setAttestedByLookupLoading(false);
    }
  };

  // Guiding questions for each section
  const GUIDING_QUESTIONS = {
    incident_details: [
      'What exactly happened? Describe the incident in your own words.',
      'Who was involved? (Include full names)',
      'When and where did this occur?',
      'How was this discovered or reported?',
      'What evidence do you have? (e.g., Teramind logs, emails, chat messages)',
    ],
    findings: [
      'What did your investigation confirm or verify?',
      'What specific evidence supports your findings?',
      'Were there any patterns or repeated behaviors?',
      'Who else was involved or aware of the situation?',
    ],
    policy_violation: [
      'Which company policies or codes of conduct were violated?',
      'How did the specific actions violate these policies?',
      'Was there improper escalation (bypassing management/P&C)?',
      'Was there insubordination, gossip, or unprofessional behavior?',
      'Did the employee fail to exercise professional judgment?',
    ],
    attachment_description: [
      'What does this attachment show or prove?',
      'When was this evidence captured (date/time)?',
      'Who is involved in this evidence?',
    ],
    impact_description: [
      'How was trust, satisfaction, or relationships affected?',
      'How was company reputation, compliance, or operations affected?',
      'How was team morale, trust, or collaboration affected?',
      'What additional supervision or intervention was required?',
    ],
  };

  // Get guiding questions for a section
  const getGuidingQuestions = (sectionContext: string): string => {
    const key = sectionContext.replace('impact_description - Impacted parties:', 'impact_description').split(' - ')[0] as keyof typeof GUIDING_QUESTIONS;
    const questions = GUIDING_QUESTIONS[key] || [];
    return questions.join('\n');
  };

  // AI Text Enhancement Handler
  const handleAIEnhance = async (
    fieldName: EnhancingField,
    currentText: string,
    setter: (text: string) => void,
    sectionContext: string
  ) => {
    if (!currentText.trim()) {
      return;
    }

    setEnhancingField(fieldName);

    try {
      const response = await axios.post('/api/ai/enhance', {
        rawText: currentText,
        sectionContext: sectionContext,
        format: 'markdown', // Request markdown formatted response
        guidingQuestions: getGuidingQuestions(sectionContext), // Pass guiding questions for better AI context
      });

      if (response.data.success && response.data.formattedText) {
        setter(response.data.formattedText);
      }
    } catch (err: any) {
      console.error('AI Enhancement error:', err);
      // Silently fail - user can try again
    } finally {
      setEnhancingField(null);
    }
  };

  // Attachment Management
  const addAttachment = () => {
    const newAttachment: Attachment = {
      id: `att_${Date.now()}`,
      nameOrLink: '',
      description: ''
    };
    setAttachments([...attachments, newAttachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(att => att.id !== id));
  };

  const updateAttachment = (id: string, field: keyof Omit<Attachment, 'id'>, value: string) => {
    setAttachments(attachments.map(att => 
      att.id === id ? { ...att, [field]: value } : att
    ));
  };

  // DOCX Download Handler
  const handleDownloadDocx = async () => {
    if (!canSubmit || !user) return;

    setIsGeneratingDoc(true);
    setDocError('');
    setDocSuccess(false);

    try {
      // Generate the DOCX document (async to fetch logo)
      const doc = await generateIncidentReportDocx({
        datePrepared,
        employeeDetails,
        incidentWhat,
        incidentLocation,
        incidentDateTime,
        incidentDetails,
        findings,
        policyViolation,
        attachments,
        impactCategories,
        impactOthersSpecify,
        impactDescription,
        reportedBy: user,
        attestedBy: attestedByDetails,
      });

      // Generate the blob
      const blob = await Packer.toBlob(doc);

      // Generate filename
      const employeeName = employeeDetails 
        ? employeeDetails.employee_name.replace(/\s+/g, '_')
        : 'Employee';
      const dateStr = new Date(datePrepared).toISOString().split('T')[0];
      const filename = `Incident_Report_${employeeName}_${dateStr}.docx`;

      // Download the file
      saveAs(blob, filename);
      
      setDocSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => setDocSuccess(false), 3000);
    } catch (err: any) {
      console.error('Document generation error:', err);
      setDocError('Failed to generate document. Please try again.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Document Header - Full Width */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        {/* Top Bar with Confidential Notice */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-2">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <p className="text-white text-sm font-bold tracking-wide">PRIVATE & CONFIDENTIAL</p>
            <button
              onClick={() => {
                sessionStorage.clear();
                router.push('/login');
              }}
              className="text-xs text-red-200 hover:text-white underline"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Header Content */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-start">
            {/* Left Side - Department & Title */}
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1">People and Culture Department</p>
              <h1 className="text-2xl font-bold text-gray-900">Incident Report</h1>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">Date Prepared:</span>{' '}
                <span className="text-gray-900">
                  {new Date(datePrepared).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </p>
            </div>
            
            {/* Right Side - Logo & User Info */}
            <div className="text-right">
              <div className="mb-2">
                <span className="text-2xl font-bold text-blue-600">go</span>
                <span className="text-2xl font-bold text-blue-800">team</span>
                <p className="text-xs text-gray-500 italic">It&apos;s better together!</p>
              </div>
              <div className="text-sm text-gray-600">
                <p>Logged in as: <span className="font-medium text-gray-800">{formatFullName(user)}</span></p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Toggle */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
            showPreview 
              ? 'bg-gray-200 text-gray-700' 
              : 'bg-blue-600 text-white'
          }`}
        >
          {showPreview ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Back to Form
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Document
            </>
          )}
        </button>
      </div>

      {/* Main Content - Split Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Side - Input Form */}
          <div className={`flex-1 min-w-0 ${showPreview ? 'hidden lg:block' : 'block'}`}>
            <div className="space-y-6">

        {/* Section 1: General Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Section 1: General Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="datePrepared" className="block text-sm font-medium text-gray-700 mb-1">
                Date Prepared <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="datePrepared"
                value={datePrepared}
                onChange={(e) => setDatePrepared(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Employee Details (Subject) */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Section 2: Employee Details (Subject)
          </h2>
          
          <div className="space-y-4">
            {/* Employee ID Input with Fetch Button */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  onBlur={handleEmployeeLookup}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEmployeeLookup();
                    }
                  }}
                  placeholder="Enter Employee ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
                <button
                  type="button"
                  onClick={handleEmployeeLookup}
                  disabled={employeeLookupLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                    employeeLookupLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {employeeLookupLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fetching...
                    </span>
                  ) : (
                    'Fetch'
                  )}
                </button>
              </div>
              {employeeLookupError && (
                <p className="mt-1 text-sm text-red-600">{employeeLookupError}</p>
              )}
            </div>

            {/* Employee Details (Read-only) */}
            {employeeDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Employee Name
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formatFullName(employeeDetails)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Employee Number
                  </label>
                  <p className="text-gray-900">
                    {employeeDetails.employee_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Position/Role
                  </label>
                  <p className="text-gray-900">
                    {employeeDetails.position || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Department/Company
                  </label>
                  <p className="text-gray-900">
                    {employeeDetails.company || 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Description of Incidents */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Section 3: Description of Incidents
          </h2>
          
          {/* A. Core Details */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded mr-2">A</span>
              Core Details
            </h3>
            
            <div className="space-y-4">
              {/* What */}
              <div>
                <label htmlFor="incidentWhat" className="block text-sm font-medium text-gray-700 mb-1">
                  What (Brief Summary) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="incidentWhat"
                  value={incidentWhat}
                  onChange={(e) => setIncidentWhat(e.target.value)}
                  placeholder="Brief description of the incident"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="incidentLocation" className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="incidentLocation"
                  value={incidentLocation}
                  onChange={(e) => setIncidentLocation(e.target.value)}
                  placeholder="Where did the incident occur?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
              </div>

              {/* Date and Time */}
              <div>
                <label htmlFor="incidentDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Date and Time of Incident <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="incidentDateTime"
                  value={incidentDateTime}
                  onChange={(e) => setIncidentDateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* B. Narrative Fields (AI Powered) */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded mr-2">B</span>
              Narrative Fields
              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                AI Powered
              </span>
            </h3>
            
            <div className="space-y-6">
              {/* Incident Details */}
              <div>
                <RichTextEditor
                  id="incidentDetails"
                  label="Incident Details"
                  value={incidentDetails}
                  onChange={setIncidentDetails}
                  placeholder="Describe what happened..."
                  required
                  minHeight={200}
                  onAIEnhance={(currentValue) => handleAIEnhance('incidentDetails', currentValue, setIncidentDetails, 'incident_details')}
                  isEnhancing={enhancingField === 'incidentDetails'}
                  aiEnhanceDisabled={!incidentDetails.trim()}
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-xs font-medium text-blue-800 mb-1.5">💡 Guiding Questions:</p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>What exactly happened? Describe the incident in your own words.</li>
                    <li>Who was involved? (Include full names)</li>
                    <li>When and where did this occur?</li>
                    <li>How was this discovered or reported?</li>
                    <li>What evidence do you have? (e.g., Teramind logs, emails, chat messages)</li>
                  </ul>
                </div>
              </div>

              {/* Findings */}
              <div>
                <RichTextEditor
                  id="findings"
                  label="Findings (Optional)"
                  value={findings}
                  onChange={setFindings}
                  placeholder="Document your investigation findings..."
                  minHeight={150}
                  onAIEnhance={(currentValue) => handleAIEnhance('findings', currentValue, setFindings, 'findings')}
                  isEnhancing={enhancingField === 'findings'}
                  aiEnhanceDisabled={!findings.trim()}
                />
                <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-md">
                  <p className="text-xs font-medium text-amber-800 mb-1.5">💡 Guiding Questions:</p>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                    <li>What did your investigation confirm or verify?</li>
                    <li>What specific evidence supports your findings?</li>
                    <li>Were there any patterns or repeated behaviors?</li>
                    <li>Who else was involved or aware of the situation?</li>
                  </ul>
                </div>
              </div>

              {/* Policy/Code of Conduct Concern */}
              <div>
                <RichTextEditor
                  id="policyViolation"
                  label="Policy/Code of Conduct Concern (Optional)"
                  value={policyViolation}
                  onChange={setPolicyViolation}
                  placeholder="Reference any policy violations..."
                  minHeight={150}
                  onAIEnhance={(currentValue) => handleAIEnhance('policyViolation', currentValue, setPolicyViolation, 'policy_violation')}
                  isEnhancing={enhancingField === 'policyViolation'}
                  aiEnhanceDisabled={!policyViolation.trim()}
                />
                <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-md">
                  <p className="text-xs font-medium text-red-800 mb-1.5">💡 Guiding Questions:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    <li>Which company policies or codes of conduct were violated?</li>
                    <li>How did the specific actions violate these policies?</li>
                    <li>Was there improper escalation (bypassing management/P&C)?</li>
                    <li>Was there insubordination, gossip, or unprofessional behavior?</li>
                    <li>Did the employee fail to exercise professional judgment?</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* C. Attachments */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-2 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded mr-2">C</span>
              Attachments
              <span className="text-gray-400 text-xs ml-2">(Optional)</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4 ml-7">
              Add supporting evidence such as: screenshots, Teramind logs, email copies, chat transcripts, or recordings.
            </p>
            
            <div className="space-y-4">
              {attachments.map((attachment, index) => (
                <div key={attachment.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600">Attachment {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-red-500 hover:text-red-700 text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attachment Name/Link
                      </label>
                      <input
                        type="text"
                        value={attachment.nameOrLink}
                        onChange={(e) => updateAttachment(attachment.id, 'nameOrLink', e.target.value)}
                        placeholder="Document name or URL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <RichTextArea
                        id={`attachment-desc-${attachment.id}`}
                        value={attachment.description}
                        onChange={(text) => updateAttachment(attachment.id, 'description', text)}
                        placeholder="Describe what this attachment shows..."
                        rows={2}
                        onAIEnhance={(currentValue) => handleAIEnhance(
                          `attachment_${attachment.id}` as EnhancingField,
                          currentValue,
                          (text) => updateAttachment(attachment.id, 'description', text),
                          'attachment_description'
                        )}
                        isEnhancing={enhancingField === `attachment_${attachment.id}`}
                        aiEnhanceDisabled={!attachment.description.trim()}
                      />
                      <p className="mt-1 text-xs text-gray-500 italic">
                        Tip: Describe what this attachment proves (e.g., "Screenshot of Slack chat dated March 15 showing [Name] discussing...")
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addAttachment}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Attachment
              </button>
            </div>
          </div>

          {/* D. Impact */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded mr-2">D</span>
              Impact
            </h3>
            
            <div className="space-y-4">
              {/* Impact Categories - Multiple Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who was impacted? <span className="text-red-500">*</span>
                  <span className="text-gray-400 text-xs ml-2">(Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {IMPACT_CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        impactCategories.includes(category)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={impactCategories.includes(category)}
                        onChange={() => toggleImpactCategory(category)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium">{category}</span>
                    </label>
                  ))}
                </div>
                {impactCategories.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    Please select at least one impacted party before describing the impact.
                  </p>
                )}
              </div>

              {/* Others - Specify (Conditional) */}
              {impactCategories.includes('Others') && (
                <div className="ml-4 p-3 border-l-4 border-blue-200 bg-blue-50 rounded-r">
                  <label htmlFor="impactOthersSpecify" className="block text-sm font-medium text-gray-700 mb-1">
                    Please specify who else was impacted <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="impactOthersSpecify"
                    value={impactOthersSpecify}
                    onChange={(e) => setImpactOthersSpecify(e.target.value)}
                    placeholder="Specify the other impacted party..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  />
                </div>
              )}

              {/* Impact Description - Disabled until categories selected */}
              <div className={impactCategories.length === 0 ? 'opacity-50 pointer-events-none' : ''}>
                <RichTextEditor
                  id="impactDescription"
                  label="How were they impacted?"
                  value={impactDescription}
                  onChange={setImpactDescription}
                  placeholder={
                    impactCategories.length === 0
                      ? 'Please select who was impacted first...'
                      : `Describe how ${impactCategories.join(', ')} ${impactCategories.length > 1 ? 'were' : 'was'} affected...`
                  }
                  required
                  minHeight={150}
                  onAIEnhance={(currentValue) => handleAIEnhance('impactDescription', currentValue, setImpactDescription, getImpactContext())}
                  isEnhancing={enhancingField === 'impactDescription'}
                  aiEnhanceDisabled={!impactDescription.trim() || impactCategories.length === 0}
                />
                <div className="mt-2 p-3 bg-purple-50 border border-purple-100 rounded-md">
                  <p className="text-xs font-medium text-purple-800 mb-1.5">💡 Consider these areas of impact:</p>
                  <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                    {impactCategories.includes('Client') && (
                      <li><strong>Client:</strong> How was trust, satisfaction, or the relationship affected?</li>
                    )}
                    {impactCategories.includes('GoTeam') && (
                      <li><strong>GoTeam:</strong> How was company reputation, compliance, or operations affected?</li>
                    )}
                    {impactCategories.includes('Peers') && (
                      <li><strong>Peers:</strong> How was team morale, trust, or collaboration affected?</li>
                    )}
                    {impactCategories.includes('Management') && (
                      <li><strong>Management:</strong> What additional supervision or intervention was required?</li>
                    )}
                    {impactCategories.includes('Others') && impactOthersSpecify && (
                      <li><strong>{impactOthersSpecify}:</strong> How were they specifically affected?</li>
                    )}
                    {impactCategories.length === 0 && (
                      <li>Select who was impacted above to see relevant questions.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4 & 5: Signatories */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Section 4 & 5: Signatories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 4: Reported By (Current User) */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                <span className="bg-green-100 text-green-800 text-sm font-semibold px-2.5 py-0.5 rounded mr-2">4</span>
                Reported By
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-white border border-green-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {formatFullName(user)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      You
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Employee No:</span>
                    <span className="ml-1 text-gray-900">{user.employee_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <span className="ml-1 text-gray-900">{user.position || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Attested By (Lookup) */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded mr-2">5</span>
                Attested By
              </h3>
              
              <div className="space-y-3">
                {/* Employee ID Input */}
                <div>
                  <label htmlFor="attestedById" className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="attestedById"
                      value={attestedById}
                      onChange={(e) => setAttestedById(e.target.value)}
                      onBlur={handleAttestedByLookup}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAttestedByLookup();
                        }
                      }}
                      placeholder="Enter Employee ID"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleAttestedByLookup}
                      disabled={attestedByLookupLoading}
                      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                        attestedByLookupLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {attestedByLookupLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Fetching...
                        </span>
                      ) : (
                        'Fetch'
                      )}
                    </button>
                  </div>
                  {attestedByLookupError && (
                    <p className="mt-1 text-sm text-red-600">{attestedByLookupError}</p>
                  )}
                </div>

                {/* Attested By Details */}
                {attestedByDetails ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {formatFullName(attestedByDetails)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attestedByDetails.position || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Employee No:</span>
                        <span className="ml-1 text-gray-900">{attestedByDetails.employee_id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Company:</span>
                        <span className="ml-1 text-gray-900">{attestedByDetails.company || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 border border-dashed border-gray-300 rounded-lg text-center">
                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-sm text-gray-500">Enter an Employee ID to look up the attesting party</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

            </div>
          </div>

          {/* Right Side - Preview Panel */}
          <div className={`w-[420px] flex-shrink-0 ${showPreview ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-6">
              {/* Preview Header */}
              <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Live Preview
                  </h3>
                  <span className="text-xs text-gray-400">Updates as you type</span>
                </div>
              </div>

              {/* Preview Content - Scrollable */}
              <div className="border border-gray-200 bg-gray-100 max-h-[calc(100vh-280px)] overflow-y-auto">
                <div className="p-3" ref={previewRef}>
                  <DocumentPreview
                    datePrepared={datePrepared}
                    employeeDetails={employeeDetails}
                    incidentWhat={incidentWhat}
                    incidentLocation={incidentLocation}
                    incidentDateTime={incidentDateTime}
                    incidentDetails={incidentDetails}
                    findings={findings}
                    policyViolation={policyViolation}
                    attachments={attachments}
                    impactCategories={impactCategories}
                    impactOthersSpecify={impactOthersSpecify}
                    impactDescription={impactDescription}
                    reportedBy={user}
                    attestedBy={attestedByDetails}
                  />
                </div>
              </div>

              {/* Submission Panel */}
              <div className="bg-white rounded-b-lg border border-t-0 border-gray-200 p-4">
                {/* Validation Checklist */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Required Fields</p>
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center ${employeeDetails ? 'text-green-600' : 'text-gray-400'}`}>
                      {employeeDetails ? (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                      Employee Details
                    </div>
                    <div className={`flex items-center ${incidentWhat && incidentLocation && incidentDateTime ? 'text-green-600' : 'text-gray-400'}`}>
                      {incidentWhat && incidentLocation && incidentDateTime ? (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                      Incident Details (What, Where, When)
                    </div>
                    <div className={`flex items-center ${incidentDetails.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                      {incidentDetails.trim() ? (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                      Incident Narrative
                    </div>
                    <div className={`flex items-center ${impactCategories.length > 0 && impactDescription.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                      {impactCategories.length > 0 && impactDescription.trim() ? (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                      Impact Assessment
                    </div>
                    <div className={`flex items-center ${attestedByDetails ? 'text-green-600' : 'text-gray-400'}`}>
                      {attestedByDetails ? (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                      Attested By
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                {docSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800">Document Downloaded!</p>
                        <p className="text-xs text-green-600">Check your downloads folder.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {docError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-800">{docError}</p>
                    </div>
                  </div>
                )}

                {/* Download DOCX Button */}
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={!canSubmit || isGeneratingDoc}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center ${
                    canSubmit && !isGeneratingDoc
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isGeneratingDoc ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Document...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Word Document
                    </>
                  )}
                </button>

                {!canSubmit && !docSuccess && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Complete all required fields to submit
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
