-- Add missing notification-related columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "token_low": true,
  "token_depleted": true,
  "power_restored": true,
  "energy_alert": true,
  "low_balance_alert": true
}';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS meter_category TEXT DEFAULT 'residential';

-- Update existing profiles to ensure they have the new columns
UPDATE public.profiles
SET
  notifications_enabled = TRUE,
  notification_preferences = '{
    "token_low": true,
    "token_depleted": true,
    "power_restored": true,
    "energy_alert": true,
    "low_balance_alert": true
  }',
  meter_category = 'residential'
WHERE
  notifications_enabled IS NULL
  OR notification_preferences IS NULL
  OR meter_category IS NULL;
    </rewrite_file>      </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>
    </rewrite_file>