export const fieldRenderers = {
  text: {
    display: 'ValueDisplay',
    editor: 'TextField',
    editorProps: {
      fullWidth: true
    }
  },

  number: {
    display: 'ValueDisplay',
    editor: 'TextField',
    editorProps: {
      type: 'number',
      inputMode: 'decimal',
      fullWidth: true
    }
  },

  currency: {
    display: 'ValueDisplay',
    editor: 'TextField',
    editorProps: {
      type: 'number',
      inputMode: 'decimal',
      fullWidth: true
    }
  },

  percent: {
    display: 'ValueDisplay',
    editor: 'TextField',
    editorProps: {
      type: 'number',
      inputProps: { min: 0, max: 100 },
      fullWidth: true
    }
  },

  boolean: {
    display: 'ValueDisplay',
    editor: 'Checkbox',
    editorProps: {}
  },

  status: {
    display: 'ValueDisplay',
    editor: 'Autocomplete',
    editorProps: {
      options: ['new', 'pending', 'approved', 'rejected', 'done'],
      fullWidth: true
    }
  },

  enum: {
    display: 'ValueDisplay',
    editor: 'Autocomplete',
    editorProps: {
      options: [], // должен быть переопределён при вызове
      fullWidth: true
    }
  },

  array: {
    display: 'ValueDisplay',
    editor: 'TextField',
    editorProps: {
      placeholder: 'элементы через запятую',
      fullWidth: true
    }
  },

  link: {
    display: 'ValueDisplay',
    editor: 'TextField',
    editorProps: {
      placeholder: 'https://example.com',
      fullWidth: true
    }
  },

  date: {
    display: 'ValueDisplay',
    editor: 'DatePicker', // реализуется отдельно
    editorProps: {
      format: 'DD.MM.YYYY'
    }
  },

  datetime: {
    display: 'ValueDisplay',
    editor: 'DateTimePicker', // реализуется отдельно
    editorProps: {
      format: 'DD.MM.YYYY HH:mm'
    }
  }
}
