/*
  FILE: src/js/services/profile-data-service.js
  PURPOSE: Reads and saves the signed-in person's visible SariSync profile.

  BEGINNER NOTE:
  A profile is the app's display information (name and mobile number). It is
  separate from Supabase Authentication, which owns the email and password.
  This service calls protected database functions that only work for the
  currently signed-in person.
*/
(function initialiseProfileDataService() {
  function client() {
    return window.SariSyncAuthSession.getClient();
  }

  async function getMyProfile() {
    const { data, error } = await client().rpc('get_my_profile');
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function updateMyProfile({ fullName, mobileNumber }) {
    const { data, error } = await client().rpc('update_my_profile', {
      p_full_name: fullName,
      p_mobile_number: mobileNumber || null
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  window.SariSyncProfileDataService = { getMyProfile, updateMyProfile };
})();
