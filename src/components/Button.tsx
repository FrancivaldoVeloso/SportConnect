import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export function Button({ title, variant = 'primary', isLoading, className = '', ...props }: ButtonProps) {
  let bgClass = 'bg-brand-primary';
  let textClass = 'text-white';

  if (variant === 'secondary') {
    bgClass = 'bg-brand-surface';
    textClass = 'text-gray-300';
  } else if (variant === 'outline') {
    bgClass = 'bg-transparent border border-brand-primary';
    textClass = 'text-brand-primary';
  }

  return (
    <TouchableOpacity
      className={`h-14 rounded-lg flex-row items-center justify-center px-4 active:opacity-80 ${bgClass} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563EB' : '#FFFFFF'} />
      ) : (
        <Text className={`font-semibold text-lg ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
