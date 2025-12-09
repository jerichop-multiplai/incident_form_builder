'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EmployeeDetails {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  position: string;
  company: string;
  created_at?: string;
}

interface UserDetails {
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

interface DocumentPreviewProps {
  datePrepared: string;
  employeeDetails: EmployeeDetails | null;
  incidentWhat: string;
  incidentLocation: string;
  incidentDateTime: string;
  incidentDetails: string;
  findings: string;
  policyViolation: string;
  attachments: Attachment[];
  impactCategories: string[];
  impactOthersSpecify: string;
  impactDescription: string;
  reportedBy: UserDetails;
  attestedBy: EmployeeDetails | null;
}

// Color constants for PDF compatibility (hex values)
const colors = {
  red600: '#dc2626',
  blue50: '#eff6ff',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',
  gray50: '#f9fafb',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  white: '#ffffff',
};

export default function DocumentPreview({
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
  reportedBy,
  attestedBy,
}: DocumentPreviewProps) {
  const formatFullName = (details: { employee_name: string }) => {
    return details.employee_name || 'N/A';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return 'Not specified';
    return new Date(dateTimeStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const impactList = impactCategories.map(cat => 
    cat === 'Others' && impactOthersSpecify ? `Others (${impactOthersSpecify})` : cat
  ).join(', ');

  return (
    <div style={{
      backgroundColor: colors.white,
      border: `1px solid ${colors.gray300}`,
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* Document Header */}
      <div style={{
        backgroundColor: colors.red600,
        padding: '6px 16px',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
      }}>
        <p style={{
          color: colors.white,
          fontSize: '12px',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          margin: 0,
        }}>PRIVATE & CONFIDENTIAL</p>
      </div>
      
      <div style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${colors.gray200}`,
        }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: colors.blue600, margin: 0 }}>
              People and Culture Department
            </p>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.gray900, margin: '4px 0' }}>
              Incident Report
            </h1>
            <p style={{ fontSize: '12px', color: colors.gray600, margin: 0 }}>
              <span style={{ fontWeight: '500' }}>Date Prepared:</span> {formatDate(datePrepared)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: colors.blue600 }}>go</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: colors.blue800 }}>team</span>
            <p style={{ fontSize: '10px', color: colors.gray500, fontStyle: 'italic', margin: 0 }}>
              It&apos;s better together!
            </p>
          </div>
        </div>

        {/* Employee Details */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: colors.blue700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}>Employee Details</h2>
          <div style={{ border: `1px solid ${colors.gray300}`, borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${colors.gray200}` }}>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800, width: '25%' }}>
                    EMPLOYEE REPORTED
                  </td>
                  <td style={{ padding: '6px 8px', width: '25%' }}>
                    {employeeDetails ? formatFullName(employeeDetails) : <span style={{ color: colors.gray400, fontStyle: 'italic' }}>Not selected</span>}
                  </td>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800, width: '16%' }}>
                    EMP ID
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {employeeDetails?.employee_id || <span style={{ color: colors.gray400 }}>—</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800 }}>
                    POSITION
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {employeeDetails?.position || <span style={{ color: colors.gray400 }}>—</span>}
                  </td>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800 }}>
                    CLIENT
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {employeeDetails?.company || <span style={{ color: colors.gray400 }}>—</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Description of Incident */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: colors.blue700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}>Description of Incident</h2>
          
          <div style={{ border: `1px solid ${colors.gray300}`, borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${colors.gray200}` }}>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800, width: '80px' }}>
                    What:
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {incidentWhat || <span style={{ color: colors.gray400, fontStyle: 'italic' }}>Not specified</span>}
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${colors.gray200}` }}>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800 }}>
                    Location:
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {incidentLocation || <span style={{ color: colors.gray400, fontStyle: 'italic' }}>Not specified</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ backgroundColor: colors.blue50, padding: '6px 8px', fontWeight: '600', color: colors.blue800 }}>
                    Time:
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {formatDateTime(incidentDateTime)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Incident Details */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: colors.gray700, marginBottom: '4px' }}>
              Incident Details:
            </h3>
            <div style={{
              backgroundColor: colors.gray50,
              borderRadius: '4px',
              padding: '8px',
              border: `1px solid ${colors.gray200}`,
              minHeight: '40px',
              color: colors.gray800,
              fontSize: '12px',
            }}>
              {incidentDetails ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{incidentDetails}</ReactMarkdown>
              ) : (
                <p style={{ color: colors.gray400, fontStyle: 'italic', fontSize: '12px', margin: 0 }}>No details provided</p>
              )}
            </div>
          </div>

          {/* Findings */}
          {findings && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: colors.gray700, marginBottom: '4px' }}>
                Findings:
              </h3>
              <div style={{
                backgroundColor: colors.gray50,
                borderRadius: '4px',
                padding: '8px',
                border: `1px solid ${colors.gray200}`,
                color: colors.gray800,
                fontSize: '12px',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{findings}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Policy Violation */}
          {policyViolation && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: colors.gray700, marginBottom: '4px' }}>
                Policy/Code of Conduct Concerns:
              </h3>
              <div style={{
                backgroundColor: colors.gray50,
                borderRadius: '4px',
                padding: '8px',
                border: `1px solid ${colors.gray200}`,
                color: colors.gray800,
                fontSize: '12px',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{policyViolation}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: colors.gray700, marginBottom: '4px' }}>
                Attachments:
              </h3>
              <ul style={{ fontSize: '12px', paddingLeft: '16px', margin: 0, color: colors.gray700 }}>
                {attachments.map((att, idx) => (
                  <li key={att.id} style={{ marginBottom: '4px' }}>
                    <span style={{ fontWeight: '500' }}>{att.nameOrLink || `Attachment ${idx + 1}`}</span>
                    {att.description && (
                      <span style={{ color: colors.gray500 }}> — {att.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impact */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: colors.gray700, marginBottom: '4px' }}>
              Impact:
            </h3>
            <p style={{ fontSize: '12px', color: colors.gray600, marginBottom: '4px' }}>
              <span style={{ fontWeight: '500' }}>Impacted Parties:</span>{' '}
              {impactList || <span style={{ color: colors.gray400, fontStyle: 'italic' }}>None selected</span>}
            </p>
            <div style={{
              backgroundColor: colors.gray50,
              borderRadius: '4px',
              padding: '8px',
              border: `1px solid ${colors.gray200}`,
              minHeight: '40px',
              color: colors.gray800,
              fontSize: '12px',
            }}>
              {impactDescription ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{impactDescription}</ReactMarkdown>
              ) : (
                <p style={{ color: colors.gray400, fontStyle: 'italic', fontSize: '12px', margin: 0 }}>No impact description provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Signatories */}
        <div>
          <h2 style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: colors.blue700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}>Signatories</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Reported By */}
            <div style={{ border: `1px solid ${colors.gray300}`, borderRadius: '4px', padding: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', color: colors.gray500, textTransform: 'uppercase', marginBottom: '4px' }}>
                Reported By
              </p>
              <p style={{ fontSize: '12px', fontWeight: '500', color: colors.gray900, margin: 0 }}>
                {formatFullName(reportedBy)}
              </p>
              <p style={{ fontSize: '10px', color: colors.gray600, margin: 0 }}>
                {reportedBy.position || 'N/A'}
              </p>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${colors.gray300}` }}>
                <p style={{ fontSize: '10px', color: colors.gray500, margin: 0 }}>Signature: _________________</p>
                <p style={{ fontSize: '10px', color: colors.gray500, marginTop: '4px' }}>Date: {formatDate(datePrepared)}</p>
              </div>
            </div>

            {/* Attested By */}
            <div style={{ border: `1px solid ${colors.gray300}`, borderRadius: '4px', padding: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', color: colors.gray500, textTransform: 'uppercase', marginBottom: '4px' }}>
                Attested By
              </p>
              {attestedBy ? (
                <>
                  <p style={{ fontSize: '12px', fontWeight: '500', color: colors.gray900, margin: 0 }}>
                    {formatFullName(attestedBy)}
                  </p>
                  <p style={{ fontSize: '10px', color: colors.gray600, margin: 0 }}>
                    {attestedBy.position || 'N/A'}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '12px', color: colors.gray400, fontStyle: 'italic', margin: 0 }}>Not selected</p>
              )}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${colors.gray300}` }}>
                <p style={{ fontSize: '10px', color: colors.gray500, margin: 0 }}>Signature: _________________</p>
                <p style={{ fontSize: '10px', color: colors.gray500, marginTop: '4px' }}>Date: _________________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
