/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppData } from '../types';

const STATE_ID = '00000000-0000-0000-0000-000000000000';

export const supabaseService = {
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
      return true;
    } catch (error) {
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

      return data.data as AppData;
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      return null;
    }
  }
};
