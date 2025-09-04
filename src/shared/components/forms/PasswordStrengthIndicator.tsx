interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return '';
    if (score < 2) return 'Weak';
    if (score < 4) return 'Medium';
    return 'Strong';
  };

  const getStrengthColor = (score: number) => {
    if (score === 0) return '';
    if (score < 2) return 'bg-destructive';
    if (score < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const strength = getPasswordStrength(password);
  const label = getStrengthLabel(strength);
  const colorClass = getStrengthColor(strength);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full ${
              level <= strength ? colorClass : 'bg-muted'
            }`}
          />
        ))}
      </div>
      {label && (
        <p className={`text-xs ${
          strength < 2 ? 'text-destructive' : 
          strength < 4 ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          Password strength: {label}
        </p>
      )}
    </div>
  );
}