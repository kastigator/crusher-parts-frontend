// src/components/fields/FullAddressField.jsx

import React from "react"
import { Typography, Box } from "@mui/material"
import LocationOnIcon from "@mui/icons-material/LocationOn"

export default function FullAddressField({ address = "", comment = "" }) {
  const hasAddress = Boolean(address && String(address).trim())
  const hasComment = Boolean(comment && String(comment).trim())

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={0.5}
      sx={{
        py: 0.5,
        whiteSpace: "normal",
        wordBreak: "break-word",
        maxWidth: 500
      }}
    >
      {hasAddress ? (
        <Box display="flex" alignItems="flex-start" gap={1}>
          <LocationOnIcon fontSize="small" color="action" sx={{ mt: "2px" }} />
          <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
            {address}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic" }}>
          — адрес не указан —
        </Typography>
      )}

      {hasComment && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ ml: "24px", lineHeight: 1.3 }}
        >
          {comment}
        </Typography>
      )}
    </Box>
  )
}
