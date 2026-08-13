import List "mo:core/List";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

actor {
  type Score = {
    playerName : Text;
    time : Nat; // Time in seconds
    distance : Nat;
  };

  module Score {
    public func compare(score1 : Score, score2 : Score) : Order.Order {
      Nat.compare(score1.time, score2.time);
    };
  };

  let scores = List.empty<Score>();

  public shared ({ caller }) func submitScore(playerName : Text, time : Nat, distance : Nat) : async () {
    if (playerName.isEmpty()) {
      Runtime.trap("Player name must not be empty.");
    };
    let score : Score = {
      playerName;
      time;
      distance;
    };
    scores.add(score);
  };

  public query ({ caller }) func getTopScores() : async [Score] {
    let allScores = scores.toArray();
    let sortedScores = allScores.sort();
    sortedScores.sliceToArray(0, if (sortedScores.size() < 10) { sortedScores.size() } else { 10 });
  };
};
