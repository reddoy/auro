import { supabase } from './supabase';

export interface MFAStatus {
  hasMFA: boolean;
  factors: any[];
}

export const getMFAStatus = async (): Promise<MFAStatus> => {
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    return {
      hasMFA: factors && factors.totp && factors.totp.length > 0,
      factors: factors?.totp || []
    };
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return {
      hasMFA: false,
      factors: []
    };
  }
};

export const createMFAChallenge = async (factorId: string) => {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating MFA challenge:', error);
    throw error;
  }
};

export const verifyMFAChallenge = async (factorId: string, code: string) => {
  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error verifying MFA:', error);
    throw error;
  }
};

export const enrollMFA = async (friendlyName: string = 'Auro App') => {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error enrolling MFA:', error);
    throw error;
  }
};

export const unenrollMFA = async (factorId: string) => {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unenrolling MFA:', error);
    throw error;
  }
};


