import React from 'react';

interface AccountSafetyNoticeProps {
  message?: string;
  type?: 'warning' | 'info' | 'error';
}

export function AccountSafetyNotice({
  message = 'Keep your account secure by using a strong password and updating your email recovery settings.',
  type = 'info',
}: AccountSafetyNoticeProps) {
  const bgColor = type === 'warning' ? '#fef3c7' : type === 'error' ? '#fee2e2' : '#e0f2fe';
  const textColor = type === 'warning' ? '#92400e' : type === 'error' ? '#991b1b' : '#075985';

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '6px',
        backgroundColor: bgColor,
        color: textColor,
        fontSize: '14px',
        marginBottom: '16px',
      }}
    >
      {message}
    </div>
  );
}
