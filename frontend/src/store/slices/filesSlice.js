import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  files: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0
  }
};

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setFiles(state, action) {
      state.files = action.payload.files;
      state.pagination = action.payload.pagination;
      localStorage.setItem('filesState', JSON.stringify({
        files: action.payload.files,
        pagination: action.payload.pagination
      }));
    },
    addFile(state, action) {
      state.files.push(action.payload);
    },
    removeFile(state, action) {
      state.files = state.files.filter(file => file.id !== action.payload);
    },
    updateFileName(state, action) {
      const { id, newName } = action.payload;
      const file = state.files.find(f => f.id === id);
      if (file) {
        file.original_name = newName;
      }
    },
    updateFileComment(state, action) {
      const { id, newComment } = action.payload;
      const file = state.files.find(f => f.id === id);
      if (file) {
        file.comment = newComment;
      }
    },
  },
});

export const loadFilesFromStorage = () => (dispatch) => {
  const savedState = localStorage.getItem('filesState');
  if (savedState) {
    const { files, pagination } = JSON.parse(savedState);
    dispatch(filesSlice.actions.setFiles({ files, pagination }));
  }
};

export const { 
  setFiles, 
  addFile, 
  removeFile, 
  updateFileName, 
  updateFileComment 
} = filesSlice.actions;

export default filesSlice.reducer;