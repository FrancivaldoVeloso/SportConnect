import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface TagProps extends ViewProps {
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'agendada' | 'em_andamento' | 'encerrada';
  label?: string;
}

export function Tag({ status, label, className = '', ...props }: TagProps) {
  let bgClass = 'bg-gray-700';
  let textClass = 'text-gray-200';
  let defaultLabel = status;

  switch (status) {
    case 'aprovado':
    case 'encerrada':
      bgClass = 'bg-[#2E7D32]/20';
      textClass = 'text-[#2E7D32]';
      break;
    case 'pendente':
    case 'agendada':
      bgClass = 'bg-[#F57C00]/20';
      textClass = 'text-[#F57C00]';
      break;
    case 'rejeitado':
      bgClass = 'bg-red-500/20';
      textClass = 'text-red-500';
      break;
    case 'em_andamento':
      bgClass = 'bg-brand-primary/20';
      textClass = 'text-brand-primary';
      break;
  }

  return (
    <View className={`px-2 py-1 rounded-md self-start ${bgClass} ${className}`} {...props}>
      <Text className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
        {label || defaultLabel}
      </Text>
    </View>
  );
}
