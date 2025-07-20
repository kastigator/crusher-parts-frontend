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
        paddingY: 0.5,
        whiteSpace: "normal",
        wordBreak: "break-word"
      }}
    >
      {hasAddress ? (
        <Box display="flex" alignItems="flex-start" gap={1}>
          <LocationOnIcon fontSize="small" color="action" sx={{ marginTop: "2px" }} />
          <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
            {address}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.disabled">
          — адрес не указан —
        </Typography>
      )}

      {hasComment && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ marginLeft: "24px", lineHeight: 1.3 }}
        >
          {comment}
        </Typography>
      )}
    </Box>
  )
}
