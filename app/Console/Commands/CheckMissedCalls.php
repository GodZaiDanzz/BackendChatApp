<?php

namespace App\Console\Commands;

use App\Events\CallEnded;
use App\Models\Call;
use Illuminate\Console\Command;

class CheckMissedCalls extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'calls:check-missed';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark calls ringing longer than 45 seconds as missed';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $threshold = now()->subSeconds(45);

        $ringingCalls = Call::where('status', 'ringing')
            ->where('created_at', '<=', $threshold)
            ->get();

        if ($ringingCalls->isEmpty()) {
            $this->info('No timed-out ringing calls found.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($ringingCalls as $call) {
            $call->update([
                'status'   => 'missed',
                'ended_at' => now(),
            ]);

            // Notify both caller and callee to terminate ringing UI
            broadcast(new CallEnded($call, [(int) $call->caller_id, (int) $call->callee_id], 'missed'));
            $count++;
        }

        $this->info("Marked {$count} call(s) as missed.");
        return self::SUCCESS;
    }
}
