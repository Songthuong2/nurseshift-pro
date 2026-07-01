/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppData } from '../types';

const STATE_ID = '00000000-0000-0000-0000-000000000000';

let lastError: any = null;

export const supabaseService = {
  getLastError() {
    return lastError;
  },

  clearLastError() {
    lastError = null;
  },

  async saveAppData(data: AppData): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    try {
      const { error } = await supabase
        .from('app_state')
        .upsert({ 
          id: STATE_ID, 
          data: data,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      lastError = null;
      return true;
    } catch (error) {
      lastError = error;
      console.error('Error saving to Supabase:', error);
      return false;
    }
  },

  async loadAppData(): Promise<AppData | null> {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', STATE_ID)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Row not found, return null to fallback to localStorage
          return null;
        }
        throw error;
      }

      lastError = null;
      return data.data as AppData;
    } catch (error) {
      lastError = error;
      console.error('Error loading from Supabase:', error);
      return null;
    }
  }
};
