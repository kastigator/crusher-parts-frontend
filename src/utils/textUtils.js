// src/utils/textUtils.js

import { slugify } from 'transliteration'

export const generateTabName = (text) => slugify(text)
