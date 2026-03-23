-- Add essential payment tracking columns to the leads table
ALTER TABLE leads 
ADD COLUMN payment_status text DEFAULT 'pending',
ADD COLUMN stripe_intent_id text;

-- Allow Artists to View Leads assigned to their acts
CREATE POLICY "Artists can view their own leads" 
ON leads FOR SELECT 
USING (act_owner_id = auth.uid());

-- Allow any client (even anonymous web visitors) to insert leads via the Checkout Modal
CREATE POLICY "Public can create leads" 
ON leads FOR INSERT 
WITH CHECK (true);
