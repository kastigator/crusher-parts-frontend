import React from "react"
import { Box, Typography } from "@mui/material"
import { LocationOn } from "@mui/icons-material"

export default function FullAddressField({
  formatted_address,
  comment,
  icon = true,
  compact = false
}) {
  return (
    <Box display="flex" alignItems="start" gap={1}>
      {icon && <LocationOn fontSize="small" sx={{ mt: compact ? 0 : "2px" }} />}
      <Box>
        <Typography variant="body2">
          {formatted_address || <i>не указано</i>}
        </Typography>
        {comment && !compact && (
          <Typography variant="caption" color="text.secondary">
            {comment}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
