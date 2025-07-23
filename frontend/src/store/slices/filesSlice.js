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
      localStorage.setItem('filesState', JSON.stringify({
        files: state.files,
        pagination: state.pagination
      }));
    },    
    removeFile(state, action) {
      state.files = state.files.filter(file => file.id !== action.payload);
      localStorage.setItem('filesState', JSON.stringify({
        files: state.files,
        pagination: state.pagination
      }));
    },    
    updateFileName(state, action) {
      const { id, newName } = action.payload;
      const file = state.files.find(f => f.id === id);
      if (file) {
        file.original_name = newName;
      }
      localStorage.setItem('filesState', JSON.stringify({
        files: state.files,
        pagination: state.pagination
      }));
    },    
    updateFileComment(state, action) {
      const { id, newComment } = action.payload;
      const file = state.files.find(f => f.id === id);
      if (file) {
        file.comment = newComment;
      }
      localStorage.setItem('filesState', JSON.stringify({
        files: state.files,
        pagination: state.pagination
      }));
    }
  }
});

// Функция для загрузки состояния файлов из localStorage при инициализации приложения
export const loadFilesFromStorage = () => (dispatch) => {
  const savedState = localStorage.getItem('filesState');
  if (savedState) {
    const { files, pagination } = JSON.parse(savedState);
    dispatch(filesSlice.actions.setFiles({ files, pagination }));
  }
};

// Экспорт всех действий для использования в компонентах
export const { 
  setFiles, 
  addFile, 
  removeFile, 
  updateFileName, 
  updateFileComment 
} = filesSlice.actions;

// Экспорт редьюсера для подключения к Redux store
export default filesSlice.reducer;
