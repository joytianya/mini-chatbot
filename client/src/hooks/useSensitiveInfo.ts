import { useState } from 'react';

interface SensitiveInfoState {
  enabled: boolean;
  toggle: () => void;
}

export const useSensitiveInfo = ({
  enabled,
  toggle
}: {
  enabled: boolean;
  toggle: () => void;
}): SensitiveInfoState => {
  return {
    enabled,
    toggle
  };
};

export type SensitiveInfoState = ReturnType<typeof useSensitiveInfo>;
