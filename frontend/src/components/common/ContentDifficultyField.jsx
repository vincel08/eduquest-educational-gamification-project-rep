import { MenuItem, TextField } from "@mui/material";
import {
  CONTENT_DIFFICULTIES,
  normalizeContentDifficulty,
} from "../../utils/contentDifficulty";

export default function ContentDifficultyField({
  value,
  onChange,
  label = "Difficulty",
  ...rest
}) {
  return (
    <TextField
      select
      label={label}
      value={normalizeContentDifficulty(value)}
      onChange={onChange}
      {...rest}
    >
      {CONTENT_DIFFICULTIES.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
