-- Allow artists to view bookings for their acts
CREATE POLICY "Artists can view bookings for their own acts"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM acts
    WHERE acts.id = bookings.act_id
    AND acts.owner_id = auth.uid()
  )
);
