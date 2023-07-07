import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isfirstTime: true,
  profileDetails: [],
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setFirstTime(state, action) {
      state.isfirstTime = action.payload;
    },
    addSocialLinks(state, action) {
      const index = state.profileDetails.findIndex(
        (item) => item.id == action.payload.id
      );

      index >= 0
        ? (state.profileDetails[index] = action.payload)
        : state.profileDetails.push(action.payload);
    },

    setProfileDetails(state, action) {
      state.profileDetails = action.payload;
    },

    removeItem(state, action) {
      const index = state.profileDetails.findIndex(
        (item) => item.id == action.payload
      );
      state.profileDetails.splice(index, 1);
    },

    updateItem(state, action) {
      const index = state.profileDetails.findIndex(
        (item) => item.id == action.payload.id
      );
      state.profileDetails[index] = action.payload;
    },

    removeSuggestion(state, action) {
      state.profileDetails = state.profileDetails.filter(
        (item) =>
          item?.content !== null &&
          item?.userName !== null &&
          item?.location !== null &&
          item?.imgUrl !== null
      );
    },
  },
});

export const profileActions = profileSlice.actions;

export default profileSlice;
