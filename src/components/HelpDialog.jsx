import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  Button,
} from '@mrmartineau/zui/react';

// How-to-play modal, in the spirit of Wordle's help dialog. Controlled by the
// parent via `open` / `onClose`.
export function HelpDialog({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
    >
      <DialogHeader>
        <DialogTitle>How to play</DialogTitle>
        <DialogDescription>One JavaScript coding rep a day. Keep the streak alive.</DialogDescription>
      </DialogHeader>

      <DialogBody>
        <ol className="help-steps">
          <li>
            <strong>Read the prompt.</strong> Each day brings one short JavaScript puzzle —
            implement the function it describes.
          </li>
          <li>
            <strong>Write your solution</strong> in the editor. The starter code gives you
            the function signature to fill in.
          </li>
          <li>
            <strong>Run the tests.</strong> Hit <em>Run tests</em> to check your code against
            the day's hidden test cases. All green means solved.
          </li>
          <li>
            <strong>Beat the clock.</strong> The timer starts on your first edit, so you can
            compare runs and share how fast you cracked it.
          </li>
          <li>
            <strong>Come back tomorrow.</strong> Solve each day to grow your streak — miss a
            day and it resets, just like the games you know.
          </li>
        </ol>

        <p className="help-note">
          Your progress lives only in this browser. Puzzles are plain YAML — anyone can
          contribute one.
        </p>
      </DialogBody>

      <DialogFooter>
        <Button onClick={onClose}>Got it</Button>
      </DialogFooter>
    </Dialog>
  );
}
